//@ts-nocheck
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { requirePermission } from "../lib/roles";

const UPLOAD_DIR = "uploads";

export function objectStoreRoutes(fastify: FastifyInstance) {
  // Upload a single attachment to a ticket (multipart/form-data, field "file").
  // Uses @fastify/multipart (fastify-multer is incompatible with fastify 5).
  fastify.post(
    "/api/v1/storage/ticket/:id/upload/single",
    // Adding an attachment writes to a ticket: allow creators or updaters.
    { preHandler: requirePermission(["issue::create", "issue::update"], false) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id }: any = request.params;

      const data: any = await request.file();
      if (!data) {
        return reply
          .status(400)
          .send({ success: false, message: "No file uploaded" });
      }

      // Uploader id: the "user" form field if it arrived before the file,
      // otherwise the subject of the (already-verified) bearer token.
      let userId: string | undefined = data.fields?.user?.value;
      if (!userId) {
        const bearer = (request.headers.authorization || "").split(" ")[1];
        const decoded: any = bearer ? jwt.decode(bearer) : null;
        userId = decoded?.data?.id;
      }

      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const storedPath = path.join(
        UPLOAD_DIR,
        crypto.randomBytes(16).toString("hex")
      );
      await pipeline(data.file, fs.createWriteStream(storedPath));
      const size = fs.statSync(storedPath).size;

      await prisma.ticketFile.create({
        data: {
          ticketId: id,
          filename: data.filename,
          path: storedPath,
          mime: data.mimetype,
          size: size,
          encoding: data.encoding || "7bit",
          userId: userId,
        },
      });

      reply.send({ success: true });
    }
  );

  // Download a ticket attachment.
  fastify.get(
    "/api/v1/storage/ticket/file/:fileId/download",
    // Reading an attachment requires being able to read issues.
    { preHandler: requirePermission("issue::read") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fileId }: any = request.params;

      const file = await prisma.ticketFile.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        return reply
          .status(404)
          .send({ success: false, message: "File not found" });
      }

      if (!fs.existsSync(file.path)) {
        return reply
          .status(404)
          .send({ success: false, message: "File missing on disk" });
      }

      const safeName = file.filename.replace(/["\r\n]/g, "");

      reply
        .header("Content-Type", file.mime || "application/octet-stream")
        .header("Content-Disposition", `attachment; filename="${safeName}"`)
        .header("Content-Length", file.size);

      return reply.send(fs.createReadStream(file.path));
    }
  );
}
