export const DTI_BASE = "/app/dti";
export const POP_BASE = "/app/pop";

export const makePaths = (base) => ({
  to: (p = "") => `${base}${p}`,
  strip: (pathname) =>
    pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname,
});



   // Usage example
			
			{ /*
				 import { DTI_BASE, makePaths } from "@/utils/routeBases";
					const { to } = makePaths(DTI_BASE);
					
					<Link
  to={to(`/edit-item/${item.id}`)}
  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white py-2 text-xs font-extrabold text-ink-700 transition hover:bg-ink-50"
>
  <Pencil size={12} />
  Edit
</Link>



navigate(to(`/item/${id}`));


				*/
			}