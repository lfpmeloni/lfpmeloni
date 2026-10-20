import DocPage from "@/components/DocPage";

const SOURCE = `# 404.md

> No such file or directory.

The path you asked for is not in this repository.

- [README.md](/README.md) - start here
- [RESUME.md](/RESUME.md)
- [PORTFOLIO/](/PORTFOLIO/)
- [CONTACT.md](/CONTACT.md)
`;

export default function NotFound() {
  return (
    <DocPage
      doc={{ file: "404.md", route: "/404.md", dir: null, name: "404.md", source: SOURCE }}
    />
  );
}
