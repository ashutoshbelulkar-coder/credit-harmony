import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useNavigate } from "react-router-dom";

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  segments: BreadcrumbSegment[];
}

export function PageBreadcrumb({ segments }: PageBreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <BreadcrumbItem key={i}>
              {isLast ? (
                <BreadcrumbPage className="text-caption">{seg.label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink
                    className="cursor-pointer text-caption"
                    onClick={() => seg.href && navigate(seg.href)}
                  >
                    {seg.label}
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
