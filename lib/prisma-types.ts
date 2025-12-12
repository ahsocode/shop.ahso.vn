import { Prisma } from "@prisma/client";

// Aliases to keep the rest of the codebase stable while using the generated Prisma types.
export type productGetPayload<S extends boolean | null | undefined | Prisma.productDefaultArgs> =
  Prisma.productGetPayload<S>;
export type productInclude = Prisma.productInclude;
export type productUpdateInput = Prisma.productUpdateInput;
export type productWhereInput = Prisma.productWhereInput;
export type productOrderByWithRelationInput = Prisma.productOrderByWithRelationInput;
export type productFindManyArgs = Prisma.productFindManyArgs;

export type userSelect = Prisma.userSelect;
export type userUpdateInput = Prisma.userUpdateInput;
export type userWhereInput = Prisma.userWhereInput;
export type userScalarWhereWithAggregatesInput = Prisma.userScalarWhereWithAggregatesInput;
export type userUncheckedUpdateInput = Prisma.userUncheckedUpdateInput;

export type orderGetPayload<S extends boolean | null | undefined | Prisma.orderDefaultArgs> = Prisma.orderGetPayload<S>;
export type orderWhereInput = Prisma.orderWhereInput;
export type orderUpdateInput = Prisma.orderUpdateInput;

export type softwareWhereInput = Prisma.softwareWhereInput;
export type softwareInclude = Prisma.softwareInclude;
export type softwareGetPayload<S extends boolean | null | undefined | Prisma.softwareDefaultArgs> =
  Prisma.softwareGetPayload<S>;

export type solutionWhereInput = Prisma.solutionWhereInput;
export type solutionInclude = Prisma.solutionInclude;
export type solutionGetPayload<S extends boolean | null | undefined | Prisma.solutionDefaultArgs> =
  Prisma.solutionGetPayload<S>;
