
import React, { useState, useEffect, ReactNode } from "react";
import {
  Home as HomeIcon,
  Camera,
  List,
  BarChart3,
  Ticket,
  FileText,
  Monitor,
  ChevronDown,
  ChevronsRight,
  Moon,
  Sun,
  Settings,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
    { title: "Home", href: "#/", Icon: HomeIcon },
    { title: "Capture Lead", href: "#/capture", Icon: Camera },
    { title: "Lead List", href: "#/leads", Icon: List },
    { title: "KPIs", href: "#/kpis", Icon: BarChart3 },
    { title: "Raffles", href: "#/raffles", Icon: Ticket },
    { title: "Materials", href: "#/materials", Icon: FileText },
    { title: "TV Display", href: "#/tv", Icon: Monitor },
];


export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className={`flex min-h-screen w-full ${isDark ? 'dark' : ''}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <div className="flex-1 flex flex-col w-full">
            <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} isDark={isDark} setIsDark={setIsDark}/>
            <ContentArea>
                {children}
            </ContentArea>
        </div>
      </div>
    </div>
  );
};

interface SidebarProps {
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState(window.location.hash || "#/");

  const handleSelect = (href: string) => {
    setSelected(href);
    setMobileMenuOpen(false); // Close mobile menu on navigation
  };

  useEffect(() => {
    const handleHashChange = () => {
        setSelected(window.location.hash || "#/");
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <>
      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
          <div 
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
          />
      )}
      <nav
        className={`fixed md:sticky top-0 h-screen shrink-0 border-r bg-white dark:bg-gray-900 shadow-sm md:shadow-none transition-all duration-300 ease-in-out z-50
        ${open ? 'w-64' : 'w-16'}
        md:flex md:flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        border-gray-200 dark:border-gray-800 p-2`}
      >
        <TitleSection open={open} />
        <div className="space-y-1 mb-8">
          {navItems.map(item => (
              <Option 
                  key={item.title}
                  Icon={item.Icon}
                  title={item.title}
                  href={item.href}
                  selected={selected}
                  setSelected={handleSelect}
                  open={open}
              />
          ))}
        </div>
        {open && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Account
            </div>
            <Option Icon={Settings} title="Settings" href="#/settings" selected={selected} setSelected={handleSelect} open={open} />
            <Option Icon={HelpCircle} title="Help" href="#/help" selected={selected} setSelected={handleSelect} open={open} />
          </div>
        )}
        <ToggleClose open={open} setOpen={setOpen} />
      </nav>
    </>
  );
};

interface OptionProps {
    Icon: React.ElementType;
    title: string;
    href: string;
    selected: string;
    setSelected: (href: string) => void;
    open: boolean;
}

const Option: React.FC<OptionProps> = ({ Icon, title, href, selected, setSelected, open }) => {
  const isSelected = selected === href;
  return (
    <a
      href={href}
      onClick={() => setSelected(href)}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon className="h-4 w-4" />
      </div>
      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </span>
      )}
    </a>
  );
};

const TitleSection = ({ open }: { open: boolean }) => {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div
              className={`transition-opacity duration-200 ${
                open ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Arenal Private Tours
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    by Small Groups
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
      <svg
        width="20"
        viewBox="0 0 50 39"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="fill-white"
      >
        <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" />
        <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" />
      </svg>
    </div>
  );
};

const ToggleClose = ({ open, setOpen }: {open: boolean, setOpen: (open: boolean) => void}) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hidden md:block" // Hide on mobile
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Hide
          </span>
        )}
      </div>
    </button>
  );
};

interface MobileHeaderProps {
  onMenuClick: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick, isDark, setIsDark }) => (
    <header className="md:hidden flex items-center justify-between p-2 border-b bg-white dark:bg-gray-900 sticky top-0 z-10 dark:border-gray-800">
        <button onClick={onMenuClick} className="p-2">
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
            <Logo />
        </div>
        <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 dark:text-gray-400"
        >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
    </header>
);

const ContentArea: React.FC<{children: ReactNode}> = ({ children }) => {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 p-4 md:p-6 overflow-auto">
      <main className="container mx-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
