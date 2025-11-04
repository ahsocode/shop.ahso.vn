-- AlterTable
ALTER TABLE `user` ADD COLUMN `role` ENUM('USER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);
