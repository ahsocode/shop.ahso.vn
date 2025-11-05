import { PrismaClient } from '@prisma/client';
import data from './solutions-seed.json' assert { type: 'json' };

const prisma = new PrismaClient();

async function main() {
  for (const s of data as any[]) {
    const slugCat = s.category.toLowerCase().replace(/\s+/g, '-');

    const category = await prisma.solutionCategory.upsert({
      where: { slug: slugCat },
      update: {},
      create: { name: s.category, slug: slugCat },
    });

    await prisma.solution.create({
      data: {
        title: s.title,
        slug: s.slug,
        summary: s.summary,
        coverImage: s.coverImage,
        bodyHtml: s.bodyHtml,
        industry: s.industry,
        usecase: s.usecase,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId: category.id,
        images: { create: s.images ?? [] },
      },
    });
  }
}

main()
  .then(() => console.log('✅ Seed xong solutions'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
