import { useState } from 'react';
import { useLocation, useNavigate } from '@remix-run/react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarFooter,
} from '~/components/ui/sidebar';
import { Icon } from '~/components/ui';
import { Logo } from '~/components/ui/logo';
import { SearchInput } from '~/components/ui/SearchInput';
import { NotificationPanel } from '~/components/ui/NotificationPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/utils/cn';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('Default');
  const [starredItems] = useState<string[]>([
    // Mock starred items - in a real app, these would come from persistence
    'Project Alpha',
    'Design System',
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <Sidebar variant="sidebar" className="border-r">
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-3">
            <Logo className="size-6" />
            <div className="flex items-center gap-1">
              <span className="text-lg font-medium">ABC Corp</span>
              <Icon.NavArrowDown className="h-3 w-3" />
            </div>
          </div>
          <NotificationPanel />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Search Input */}
        <SidebarGroup className="px-1 pb-0">
          <SidebarGroupContent>
            <form onSubmit={handleSearch} className="px-2">
              <SearchInput
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                className="h-8"
              />
            </form>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/'}>
                  <a href="/">
                    <Icon.Clock />
                    <span>Recent</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/tools'}>
                  <a href="/tools">
                    <Icon.GridPlus />
                    <span>Tools</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Team Selector */}
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-fit justify-between pb-0">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary flex size-5 items-center justify-center rounded-full text-xs font-semibold text-white">
                          {selectedTeam.charAt(0).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-base font-medium">{selectedTeam}</span>
                          <Icon.NavArrowDown className="h-3 w-3" />
                        </div>
                      </div>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[200px]">
                    <DropdownMenuItem
                      className={cn(selectedTeam !== 'Default' && 'ml-7')}
                      onClick={() => setSelectedTeam('Default')}
                    >
                      {selectedTeam === 'Default' && <Icon.Check className="mr-1 h-4 w-4" />}
                      Default
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn(selectedTeam !== 'Work' && 'ml-7')}
                      onClick={() => setSelectedTeam('Work')}
                    >
                      {selectedTeam === 'Work' && <Icon.Check className="mr-1 h-4 w-4" />}
                      Work
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn(selectedTeam !== 'Personal' && 'ml-7')}
                      onClick={() => setSelectedTeam('Personal')}
                    >
                      {selectedTeam === 'Personal' && <Icon.Check className="mr-1 h-4 w-4" />}
                      Personal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Projects Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/projects'}>
                  <a href="/projects">
                    <Icon.ViewGrid />
                    <span>All Projects</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/files'}>
                  <a href="/files">
                    <Icon.PageFlip />
                    <span>Files</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/trash'}>
                  <a href="/trash">
                    <Icon.Trash />
                    <span>Trash</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Starred Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Starred</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {starredItems.length > 0 ? (
                starredItems.map((item) => (
                  <SidebarMenuItem key={item}>
                    <SidebarMenuButton asChild>
                      <a href={`/project/${item.toLowerCase().replace(/\s+/g, '-')}`}>
                        <span className="truncate">{item}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <div className="text-sidebar-foreground/50 px-3 py-2 text-xs">No starred items</div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full">
                  <Icon.User />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">User</span>
                    <span className="truncate text-xs">user@example.com</span>
                  </div>
                  <Icon.MoreHoriz className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Icon.User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Icon.Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/billing')}>
                  <Icon.CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/help')}>
                  <Icon.HelpCircle className="mr-2 h-4 w-4" />
                  Help & Support
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/docs')}>
                  <Icon.Book className="mr-2 h-4 w-4" />
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    // Handle logout
                    console.log('Logging out...');
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <Icon.LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
