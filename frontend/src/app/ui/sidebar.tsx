"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Home" },
  {
    href: "/experiments/warehouse",
    label: "Baseline",
  },
  {
    href: "/experiments/autoregressive",
    label: "Autoregression",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="sidebar" data-collapsed={collapsed}>
      <div className="sidebar-header">
        <Link className="brand" href="/" aria-label="Jev Lab home">
          <span className="brand-bars" aria-hidden="true" />
          <span className="brand-name">JEV LAB</span>
        </Link>
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? "→" : "←"}</span>
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Experiment navigation">
        {navigation.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              className="nav-link"
              data-active={active}
              href={item.href}
              key={item.href}
              aria-current={active ? "page" : undefined}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-status">
        <span className="status-mark" aria-hidden="true" />
        <span>2 fields online</span>
      </div>
    </aside>
  );
}
