'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, ShoppingCart, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/store';

interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  onOpenSidebar?: () => void;
}

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(({ onOpenSidebar, className }, ref) => {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navigation = [
    { name: 'Home', href: '/', current: pathname === '/' },
    ...(isAuthenticated ? [
      { name: 'POS', href: '/pos', current: pathname === '/pos' },
      { name: 'Inventory', href: '/ims', current: pathname === '/ims' },
      { name: 'Admin', href: '/admin/dashboard', current: pathname === '/admin/dashboard' },
    ] : []),
  ];

  return (
    <header
      ref={ref}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'glass-heavy shadow-soft py-2' : 'bg-transparent py-4'
      )}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-soft">
                <span className="text-xl">🥧</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">myPiPOS</h1>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 hidden sm:block">Universal Pi Commerce</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'text-sm font-medium transition-colors duration-200',
                    item.current ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400'
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => router.push('/pos')}>
                  <ShoppingCart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/customer')}>
                  <User className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => router.push('/')}>Login</Button>
            )}

            <button
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                onOpenSidebar?.();
              }}
              className="md:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 animate-slide-down">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    router.push(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    'text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    item.current
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
});

Navbar.displayName = 'Navbar';

export { Navbar };
