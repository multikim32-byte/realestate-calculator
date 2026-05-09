import BlogEditor from '../BlogEditor';

export default function NewBlogPage() {
  return (
    <BlogEditor
      initial={{
        slug: '',
        title: '',
        description: '',
        content: '',
        thumbnail_url: null,
        category: '부동산정보',
        is_published: false,
      }}
    />
  );
}
