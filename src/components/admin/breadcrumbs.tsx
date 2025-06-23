'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useProjectData } from '@/contexts/views-context';
import { useMemo, Fragment } from 'react';

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const formatSlug = (slug: string) => (slug ? slug.split('-').map(capitalize).join(' ').trim() : '');

export default function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams<{ projectId?: string; entityId?: string; viewId?: string }>();
  const { getEntity, getView } = useProjectData();

  const breadcrumbs = useMemo(() => {
    const items = [{ label: 'Projects', href: '/admin' }];
    if (!params.projectId) return items;

    items.push({ label: formatSlug(params.projectId), href: `/admin/projects/${params.projectId}` });

    if (!params.entityId) {
      items.push({ label: 'Entities', href: pathname });
    } else {
      const entity = getEntity(params.entityId);
      const entityName = entity ? entity.name : formatSlug(params.entityId);
      items.push({ label: entityName, href: `/admin/projects/${params.projectId}/entities/${params.entityId}` });

      if (!params.viewId) {
        items.push({ label: 'Views', href: pathname });
      } else {
        const view = getView(params.entityId, params.viewId);
        const viewName = view ? view.name : formatSlug(params.viewId);
        items.push({ label: viewName, href: pathname });
      }
    }
    return items;
  }, [pathname, params, getEntity, getView]);

  return (
    <nav className="flex items-center space-x-2 text-xl font-semibold text-white">
      {breadcrumbs.map((item, index) => (
        <Fragment key={item.href + item.label}>
          {index > 0 && <ChevronRight className="h-5 w-5 text-neutral-400" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-white">{item.label}</span>
          ) : (
            <Link href={item.href} className="text-neutral-400 hover:text-white transition-colors">
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
