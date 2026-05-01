-- AlterEnum (PostgreSQL): add categories for richer change log UI
ALTER TYPE "ChangeCategory" ADD VALUE 'VISA';
ALTER TYPE "ChangeCategory" ADD VALUE 'CONTRACT';
ALTER TYPE "ChangeCategory" ADD VALUE 'CONTACT';
