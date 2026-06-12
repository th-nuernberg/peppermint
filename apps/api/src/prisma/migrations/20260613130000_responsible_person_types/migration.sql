-- Make Ticket.type a free-text String (was the TicketType enum) so custom,
-- human-readable type labels can be used without further migrations.
-- Existing rows keep their value as text (e.g. 'bug' -> 'bug').
ALTER TABLE "Ticket" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "type" SET DATA TYPE TEXT USING "type"::text;
ALTER TABLE "Ticket" ALTER COLUMN "type" SET DEFAULT 'Anfrage';

-- The enum is no longer referenced by any column.
DROP TYPE "TicketType";
