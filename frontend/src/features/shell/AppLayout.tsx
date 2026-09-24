import { type ReactElement, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useViewer, useWorkspace } from '../workspace/workspaceQueries';
import { ShellView } from './ShellView';
import { useFocusOnNavigation } from './useFocusOnNavigation';
import { useMobileMenu } from './useMobileMenu';

export function AppLayout(): ReactElement {
  const viewer = useViewer();
  const workspace = useWorkspace();
  const { pathname } = useLocation();
  const { menu, menuButtonRef } = useMobileMenu(pathname);
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnNavigation(pathname, mainRef);
  return (
    <ShellView
      viewerName={viewer.data?.display_name ?? null}
      isSandbox={workspace.data?.is_sandbox ?? false}
      menu={menu}
      menuButtonRef={menuButtonRef}
      mainRef={mainRef}
    >
      <ScrollRestoration />
      <Outlet />
    </ShellView>
  );
}
