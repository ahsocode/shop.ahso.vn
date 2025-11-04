-- DropIndex
DROP INDEX `User_role_idx` ON `user`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `avatarUrl` VARCHAR(191) NULL DEFAULT '/logo.png';
