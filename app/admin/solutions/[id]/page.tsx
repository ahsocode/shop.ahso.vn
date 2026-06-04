import { ContentArticleEditor } from "@/components/admin/content/ContentArticleEditor";

export default async function AdminEditSolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ContentArticleEditor id={id} kind="solution" />;
}
