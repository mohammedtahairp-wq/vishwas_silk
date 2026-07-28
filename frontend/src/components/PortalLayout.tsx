import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  to: string;
  label: string;
  icon?: string;
  end?: boolean;
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="w-5 h-5 relative flex flex-col justify-center items-center">
      <span
        className={`absolute block h-0.5 w-5 rounded-sm transition-all duration-300 ease-out ${
          open ? "rotate-45 translate-y-0" : "-translate-y-1.5"
        }`}
        style={{ background: "#4f46e5" }}
      />
      <span
        className={`absolute block h-0.5 w-5 rounded-sm transition-all duration-300 ease-out ${
          open ? "opacity-0" : "opacity-100"
        }`}
        style={{ background: "#4f46e5" }}
      />
      <span
        className={`absolute block h-0.5 w-5 rounded-sm transition-all duration-300 ease-out ${
          open ? "-rotate-45 translate-y-0" : "translate-y-1.5"
        }`}
        style={{ background: "#4f46e5" }}
      />
    </div>
  );
}

export function PortalLayout({ title, navItems }: { title: string; navItems: NavItem[] }) {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100/80">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            VS
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight" style={{ color: "#1e1b4b" }}>
              {title}
            </h1>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "#a5b4fc" }}>
              Management
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 overflow-y-auto py-3">
        {navItems.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
          >
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group mx-3 my-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative ${
                  isActive
                    ? "font-semibold"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
                        border: "1px solid rgba(99, 102, 241, 0.15)",
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    {item.icon && <span className="text-base">{item.icon}</span>}
                    <span className={isActive ? "text-indigo-700" : ""}>{item.label}</span>
                  </span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)" }}
    >
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            VS
          </div>
          <span className="font-semibold text-sm" style={{ color: "#1e1b4b" }}>
            {title}
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Toggle menu"
        >
          <HamburgerIcon open={sidebarOpen} />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col"
            style={{ background: "linear-gradient(180deg, #ffffff 0%, #fafbff 100%)" }}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex md:w-64 bg-white md:border-r border-gray-100 flex-col shadow-sm md:shadow-lg shrink-0"
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #fafbff 100%)" }}
      >
        {sidebarContent}
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-y-auto pt-14 md:pt-0">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="p-4 md:p-8 max-w-[1400px] mx-auto"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
