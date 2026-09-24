import { type ReactElement, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
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
  const isNavigating = useNavigation().state !== 'idle';
  useFocusOnNavigation(pathname, mainRef);
  return (
    <ShellView
      viewerName={viewer.data?.display_name ?? null}
      isSandbox={workspace.data?.is_sandbox ?? false}
      menu={menu}
      menuButtonRef={menuButtonRef}
      mainRef={mainRef}
      isNavigating={isNavigating}
    >
      <ScrollRestoration />
      <Outlet />
    </ShellView>
  );
}
