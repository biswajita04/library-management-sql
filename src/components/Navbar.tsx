import type { PortalRoute } from '../lib/libraryLogic.ts';

interface NavbarProps {
  currentRoute: PortalRoute;
  onNavigate: (route: PortalRoute, options?: { focusForm?: boolean }) => void;
}

const NAV_ITEMS: Array<{ route: PortalRoute; label: string }> = [
  { route: '/student', label: 'Student Portal' },
  { route: '/book', label: 'Book Portal' },
  { route: '/borrowlist', label: 'Borrow List' },
];

export function Navbar({ currentRoute, onNavigate }: NavbarProps) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-8">
          <a
            href="/student"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/student');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded"
          >
            Athenaeum
          </a>

          <nav
            aria-label="Primary Portals"
            className="hidden md:flex items-center gap-8 h-16"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <a
                  key={item.route}
                  href={item.route}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.route);
                  }}
                  className={`relative h-16 inline-flex items-center text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset rounded ${
                    isActive
                      ? 'text-blue-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('/borrowlist', { focusForm: true })}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 active:bg-blue-900 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Issue Book
            </button>
          </div>
        </div>

        <nav
          aria-label="Mobile Portals"
          className="flex md:hidden items-center gap-6 pb-3 overflow-x-auto border-t border-slate-100 pt-2.5"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <a
                key={item.route}
                href={item.route}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.route);
                }}
                className={`text-sm font-medium whitespace-nowrap shrink-0 pb-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-blue-700 border-blue-700'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
