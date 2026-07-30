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
        style={{ background: "#059669" }}
      />
      <span
        className={`absolute block h-0.5 w-5 rounded-sm transition-all duration-300 ease-out ${
          open ? "opacity-0" : "opacity-100"
        }`}
        style={{ background: "#059669" }}
      />
      <span
        className={`absolute block h-0.5 w-5 rounded-sm transition-all duration-300 ease-out ${
          open ? "-rotate-45 translate-y-0" : "translate-y-1.5"
        }`}
        style={{ background: "#059669" }}
      />
    </div>
  );
}

export function PortalLayout({ title, navItems, mobileNav = "sidebar" }: { title: string; navItems: NavItem[]; mobileNav?: "sidebar" | "bottom" }) {
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
          <img src="/logo.jpeg" alt="VISHWAS SILK" className="h-9 w-auto" />
          <div>
            <h1 className="text-base font-bold tracking-tight" style={{ color: "#064e3b" }}>
              {title}
            </h1>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "#6ee7b7" }}>
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
                        background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
                        border: "1px solid rgba(16, 185, 129, 0.15)",
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    {item.icon && <span className="text-base">{item.icon}</span>}
                    <span className={isActive ? "text-emerald-700" : ""}>{item.label}</span>
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
          <img src="/logo.jpeg" alt="VISHWAS SILK" className="h-8 w-auto" />
          <span className="font-semibold text-sm" style={{ color: "#064e3b" }}>
            {title}
          </span>
        </div>
        {mobileNav === "sidebar" && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Toggle menu"
          >
            <HamburgerIcon open={sidebarOpen} />
          </button>
        )}
        {mobileNav === "bottom" && (
          <button
            onClick={logout}
            className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500 hover:text-red-600"
            aria-label="Sign out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>

      {/* Mobile sidebar overlay - only for sidebar mode */}
      {mobileNav === "sidebar" && (
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
      )}

      {/* Mobile sidebar drawer - only for sidebar mode */}
      {mobileNav === "sidebar" && (
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
      )}

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

      {/* Mobile bottom nav */}
      {mobileNav === "bottom" && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200/60 flex shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 min-w-0 transition-colors ${
                  isActive ? "text-emerald-600" : "text-gray-400"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label === "My Customers" && (
                    <svg className="w-5 h-5 mb-0.5" fill={isActive ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 0 : 1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  )}
                  {item.label === "Log Pickup" && (
                    <svg className="w-5 h-5 mb-0.5" fill={isActive ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 0 : 1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {item.label === "Customer Product History" && (
                    <svg className="w-5 h-5 mb-0.5" fill={isActive ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 0 : 1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="text-[10px] leading-tight truncate max-w-full px-1">
                    {item.label === "Customer Product History" ? "History" : item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Main content */}
      <main className={`flex-1 min-h-0 overflow-y-auto pt-14 md:pt-0 ${mobileNav === "bottom" ? "pb-16" : ""}`}>
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
