import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

export function PortalLayout({ title, navItems }: { title: string; navItems: NavItem[] }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <aside className="md:w-56 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex md:flex-col">
        <div className="px-4 py-4 font-semibold text-gray-900 border-b border-gray-200 hidden md:block">
          {title}
        </div>
        <nav className="flex md:flex-col flex-1 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-3 text-sm whitespace-nowrap md:whitespace-normal ${
                  isActive ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="px-4 py-3 text-sm text-gray-500 hover:bg-gray-100 text-left md:mt-auto md:border-t md:border-gray-200"
        >
          Log out
        </button>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
