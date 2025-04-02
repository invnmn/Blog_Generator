import { Link, useLocation } from "react-router-dom";
import { Pen, Layout } from "lucide-react";
import { cn } from "../lib/utils";

export default function Navbar() {
  const location = useLocation();

  const links = [
    { href: "/", label: "Blog Generator", icon: Pen },
    { href: "/editor", label: "Webpage Editor", icon: Layout },
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className={cn(
                  "flex items-center space-x-2 text-sm font-medium transition-colors",
                  location.pathname === href
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}