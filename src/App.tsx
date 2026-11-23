import React, { useEffect, useState } from 'react';
import {
  CommunityRequest,
  GUIDES_CATALOG,
  INITIAL_COMMUNITY_REQUESTS,
  INITIAL_SERVERS,
  RESOURCES_CATALOG,
  ResourceItem,
  ServerListing,
  TOOLS_CATALOG,
  ToolCategory,
} from './data/catalog';
import { ThemeStyleId, getThemePreset } from './utils/themePresets';
import { Layout } from './components/Layout';
import { HomePage } from './components/HomePage';
import { AdvancedToolsDirectory, ToolsDirectory } from './components/ToolsDirectory';
import { ToolWorkbench } from './components/ToolWorkbench';
import {
  CommunityPage,
  GuidesPage,
  ResourcesPage,
  ServersPage,
} from './components/DirectoryPages';
import {
  ApiKeyItem,
  DashboardPage,
  DashboardSection,
  SavedConfigItem,
} from './components/DashboardPage';
import { OwnedDomainItem } from './components/CustomServerAddressStudio';
import { PluginsPage } from './components/PluginsPage';
import { ServerDomainPage } from './components/ServerDomainPage';
import { sanitizeDomainHandle } from './utils/networkDomain';
import { PluginListing, isOwnerUser } from './utils/pluginMarketplace';
import { getRedirectResult, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  ensureUserProfile,
  getFirebaseAuthHeaders,
  handleFirestoreError,
  updateUserProfileFields,
} from './firebase';
import { AuthPage, AuthUserState } from './components/AuthPage';
import {
  AssistantPage,
  BashProtectPage,
  ChangelogPage,
  PricingPage,
  StaticInfoPage,
} from './components/BrandPages';

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [themeId, setThemeId] = useState<ThemeStyleId>(() => {
    const saved = loadStored<string>('surgetrix_theme', 'obsidian');
    return getThemePreset(saved).id;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToolCategory, setSelectedToolCategory] = useState<'All' | ToolCategory>('All');
  const [resources, setResources] = useState<ResourceItem[]>(() => {
    const stored = loadStored<ResourceItem[]>('surgetrix_resources', RESOURCES_CATALOG);
    const normalized = stored
      .filter((item) => item.kind !== 'plugin' && (item.kind as string) !== 'plugins')
      .map((item) => ({ ...item }));
    const missingDefaults = RESOURCES_CATALOG.filter(
      (r) => !normalized.some((existing) => existing.id === r.id)
    );
    return missingDefaults.length > 0 ? [...normalized, ...missingDefaults] : normalized;
  });
  const [plugins, setPlugins] = useState<PluginListing[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState<boolean>(true);
  const [communityRequests, setCommunityRequests] = useState<CommunityRequest[]>(() =>
    loadStored('surgetrix_requests', INITIAL_COMMUNITY_REQUESTS)
  );
  const [votedIds, setVotedIds] = useState<string[]>(() =>
    loadStored('surgetrix_voted', [])
  );
  const [servers, setServers] = useState<ServerListing[]>(() =>
    loadStored('surgetrix_user_servers', INITIAL_SERVERS)
  );
  const [savedConfigs, setSavedConfigs] = useState<SavedConfigItem[]>(() =>
    loadStored('surgetrix_saved_configs', [])
  );
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(() =>
    loadStored('surgetrix_api_keys', [])
  );
  const [ownedDomains, setOwnedDomains] = useState<OwnedDomainItem[]>(() =>
    loadStored('surgetrix_owned_domains', [])
  );
  const [user, setUser] = useState<AuthUserState | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const refreshPlugins = async () => {
    setPluginsLoading(true);
    try {
      const ownerMode = isOwnerUser(auth.currentUser);
      const headers = ownerMode ? await getFirebaseAuthHeaders() : {};
      const res = await fetch(ownerMode ? '/api/plugins?includeHidden=1' : '/api/plugins', {
        headers,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        plugins?: PluginListing[];
      };
      if (res.ok && data.ok && Array.isArray(data.plugins)) {
        setPlugins(data.plugins);
      }
    } catch {
      // keep existing plugins state
    } finally {
      setPluginsLoading(false);
    }
  };

  useEffect(() => {
    void refreshPlugins();
  }, [user?.uid, user?.emailVerified]);

  const activeTheme = getThemePreset(themeId);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(activeTheme.vars).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
    root.style.colorScheme = activeTheme.mode;
    if (activeTheme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('surgetrix_theme', JSON.stringify(themeId));
    } catch {
      // ignore
    }
  }, [activeTheme, themeId]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    void getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          return ensureUserProfile(result.user, themeId);
        }
        return null;
      })
      .catch((err) => {
        console.error('Google redirect auth completion failed:', err);
      });

    let unsubProfile: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!fbUser) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const fallbackName =
        fbUser.displayName || fbUser.email?.split('@')[0] || 'SurgePlayer';

      if (!fbUser.emailVerified) {
        setUser((prev) => ({
          uid: fbUser.uid,
          username:
            prev && prev.uid === fbUser.uid && prev.username
              ? prev.username
              : fallbackName,
          email: fbUser.email || '',
          plan: 'Free',
          emailVerified: false,
        }));
        setAuthLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfile(fbUser, themeId);
        setUser({
          uid: fbUser.uid,
          username: profile?.username || fallbackName,
          email: fbUser.email || '',
          plan: profile?.plan || 'Free',
          emailVerified: true,
        });
      } catch (err) {
        console.error('Failed to initialize user profile:', err);
        setUser({
          uid: fbUser.uid,
          username: fallbackName,
          email: fbUser.email || '',
          plan: 'Free',
          emailVerified: true,
        });
      } finally {
        setAuthLoading(false);
      }

      const userPath = `users/${fbUser.uid}`;
      unsubProfile = onSnapshot(
        doc(db, 'users', fbUser.uid),
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data();
          setUser((prev) => ({
            uid: fbUser.uid,
            username: typeof data.username === 'string' ? data.username : prev?.username || fallbackName,
            email: fbUser.email || prev?.email || '',
            plan: typeof data.plan === 'string' ? data.plan : 'Free',
            emailVerified: true,
          }));
          if (typeof data.preferredTheme === 'string') {
            setThemeId(getThemePreset(data.preferredTheme).id);
          }
        },
        (err) => {
          if (!auth.currentUser) return;
          try {
            handleFirestoreError(err, OperationType.GET, userPath);
          } catch {
            // Logged structured error without crashing React listener thread
          }
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('surgetrix_resources', JSON.stringify(resources));
      localStorage.setItem('surgetrix_requests', JSON.stringify(communityRequests));
      localStorage.setItem('surgetrix_voted', JSON.stringify(votedIds));
      localStorage.setItem('surgetrix_user_servers', JSON.stringify(servers));
      localStorage.setItem('surgetrix_saved_configs', JSON.stringify(savedConfigs));
      localStorage.setItem('surgetrix_api_keys', JSON.stringify(apiKeys));
      localStorage.setItem('surgetrix_owned_domains', JSON.stringify(ownedDomains));
    } catch {
      // ignore storage failures
    }
  }, [resources, communityRequests, votedIds, servers, savedConfigs, apiKeys, ownedDomains]);

  const handleSelectTheme = (nextTheme: ThemeStyleId) => {
    setThemeId(nextTheme);
    if (user?.uid && user.emailVerified) {
      void updateUserProfileFields(user.uid, { preferredTheme: nextTheme }).catch(() => {});
    }
  };

  const navigate = (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized !== currentPath) {
      window.history.pushState({}, '', normalized);
      setCurrentPath(normalized);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleSelectCategory = (cat: ToolCategory) => {
    setSelectedToolCategory(cat);
    navigate('/tools');
  };

  const handleSearchSubmit = (q: string) => {
    setSearchQuery(q);
    navigate('/search');
  };

  const handleToggleVote = (id: string) => {
    const already = votedIds.includes(id);
    setVotedIds((prev) => (already ? prev.filter((x) => x !== id) : [...prev, id]));
    setCommunityRequests((prev) =>
      prev
        .map((r) =>
          r.id === id ? { ...r, votes: Math.max(0, r.votes + (already ? -1 : 1)) } : r
        )
        .sort((a, b) => b.votes - a.votes)
    );
  };

  const handleAddRequest = (title: string, description: string, category: string) => {
    const item: CommunityRequest = {
      id: `req-${Date.now()}`,
      title,
      description,
      category,
      author: user?.username || 'Community Member',
      votes: 1,
      status: 'Under Review',
      createdAt: 'Just now',
    };
    setCommunityRequests((prev) => [item, ...prev]);
    setVotedIds((prev) => [...prev, item.id]);
  };

  const handleRefreshServerPing = async (id: string) => {
    const target = servers.find((s) => s.id === id);
    if (!target) return;
    const editionParam = target.edition === 'Bedrock' ? 'bedrock' : 'java';
    try {
      const res = await fetch(
        `/api/mc-status?address=${encodeURIComponent(target.ip)}&edition=${editionParam}`
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        online?: boolean;
        playersOnline?: number;
        maxPlayers?: number;
        version?: string;
        motdClean?: string;
      };
      if (!res.ok || !data.ok) return;
      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: data.online ? 'Online' : 'Offline',
                playersOnline: typeof data.playersOnline === 'number' ? data.playersOnline : s.playersOnline,
                maxPlayers: typeof data.maxPlayers === 'number' && data.maxPlayers > 0 ? data.maxPlayers : s.maxPlayers,
                version: data.version || s.version,
                motd: data.motdClean || s.motd,
              }
            : s
        )
      );
    } catch {
      // Keep current server entry state if probe fails
    }
  };

  const renderPage = () => {
    const path = currentPath.replace(/\/+$/, '') || '/';

    if (path === '/') {
      return (
        <HomePage
          onNavigate={navigate}
          onSelectCategory={handleSelectCategory}
          onSearchSubmit={handleSearchSubmit}
          activeTheme={activeTheme}
          onSelectTheme={handleSelectTheme}
          servers={servers}
        />
      );
    }

    if (path === '/tools') {
      return (
        <ToolsDirectory
          key={selectedToolCategory}
          onNavigate={navigate}
          initialCategory={selectedToolCategory}
        />
      );
    }

    if (path.startsWith('/tools/')) {
      const slug = path.replace('/tools/', '').split('/')[0];
      return <ToolWorkbench slug={slug} onNavigate={navigate} />;
    }

    if (path === '/advanced-tools') {
      return <AdvancedToolsDirectory onNavigate={navigate} />;
    }

    if (path.startsWith('/s/') || path.startsWith('/connect/')) {
      const rawHandle = path.startsWith('/s/')
        ? path.slice('/s/'.length).split('/')[0]
        : path.slice('/connect/'.length).split('/')[0];
      return (
        <ServerDomainPage
          handle={sanitizeDomainHandle(rawHandle)}
          localDomains={ownedDomains}
          onNavigate={navigate}
        />
      );
    }

    if (path === '/servers') {
      return (
        <ServersPage
          servers={servers}
          onLikeServer={(id) =>
            setServers((prev) =>
              prev.map((s) => (s.id === id ? { ...s, likes: s.likes + 1 } : s))
            )
          }
          onOpenListServer={() => navigate('/dashboard/servers')}
          onOpenFreeDomains={() => navigate('/dashboard/domains')}
          onRefreshServer={handleRefreshServerPing}
        />
      );
    }

    if (path === '/dashboard' || path.startsWith('/dashboard/') || path === '/developers/api-keys') {
      const rawSub = path === '/developers/api-keys'
        ? 'api-keys'
        : path.replace('/dashboard', '').replace(/^\//, '').split('/')[0] || 'overview';
      const sub = rawSub === 'subdomains' ? 'domains' : rawSub;
      const validSections: DashboardSection[] = [
        'overview',
        'servers',
        'domains',
        'plugins',
        'owner',
        'configs',
        'api-keys',
        'settings',
      ];
      const section: DashboardSection = validSections.includes(sub as DashboardSection)
        ? (sub as DashboardSection)
        : 'overview';

      return (
        <DashboardPage
          section={section}
          onNavigate={navigate}
          user={user}
          activeTheme={activeTheme}
          onSelectTheme={handleSelectTheme}
          servers={servers}
          onAddServer={(srv) => setServers((prev) => [srv, ...prev])}
          onRemoveServer={(id) =>
            setServers((prev) => prev.filter((s) => s.id !== id))
          }
          onUpdateServer={(id, patch) =>
            setServers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
          }
          onToggleServerStatus={(id) =>
            setServers((prev) =>
              prev.map((s) =>
                s.id === id
                  ? { ...s, status: s.status === 'Online' ? 'Offline' : 'Online' }
                  : s
              )
            )
          }
          onRefreshServerStatus={handleRefreshServerPing}
          ownedDomains={ownedDomains}
          onSaveDomain={(dom) =>
            setOwnedDomains((prev) => [
              dom,
              ...prev.filter((d) => d.handle !== dom.handle),
            ])
          }
          onDeleteDomain={(handle) =>
            setOwnedDomains((prev) => prev.filter((d) => d.handle !== handle))
          }
          savedConfigs={savedConfigs}
          onSaveConfig={(cfg) => setSavedConfigs((prev) => [cfg, ...prev])}
          onDeleteConfig={(id) =>
            setSavedConfigs((prev) => prev.filter((c) => c.id !== id))
          }
          apiKeys={apiKeys}
          onCreateApiKey={(label) => {
            const rand = Math.random().toString(36).slice(2) + Date.now().toString(36);
            setApiKeys((prev) => [
              {
                id: `key-${Date.now()}`,
                label,
                token: `st_live_${rand}`,
                createdAt: new Date().toLocaleDateString(),
              },
              ...prev,
            ]);
          }}
          onDeleteApiKey={(id) =>
            setApiKeys((prev) => prev.filter((k) => k.id !== id))
          }
          plugins={plugins}
          onRefreshPlugins={refreshPlugins}
          communityRequests={communityRequests}
          onUpdateCommunityRequest={(id, patch) =>
            setCommunityRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
          }
          onDeleteCommunityRequest={(id) =>
            setCommunityRequests((prev) => prev.filter((r) => r.id !== id))
          }
        />
      );
    }

    if (path === '/changelogs') {
      return <ChangelogPage onNavigate={navigate} />;
    }

    if (path === '/plugin' || path === '/plugins' || path.startsWith('/plugin/')) {
      const slug = path.startsWith('/plugin/')
        ? path.slice('/plugin/'.length).split('/')[0]
        : null;
      return (
        <PluginsPage
          user={user}
          plugins={plugins}
          loading={pluginsLoading}
          selectedSlug={slug}
          onRefreshPlugins={refreshPlugins}
          onPluginUpdated={(updated) =>
            setPlugins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          }
          onNavigate={navigate}
        />
      );
    }

    if (
      path === '/resources' ||
      path === '/mods' ||
      path === '/apps' ||
      path === '/resource-packs'
    ) {
      const normalizedKind = path.slice(1) as 'resources' | 'mods' | 'apps' | 'resource-packs';
      return (
        <ResourcesPage
          kind={normalizedKind}
          resources={resources}
          onPublishResource={(item) => setResources((prev) => [item, ...prev])}
          onNavigate={navigate}
        />
      );
    }

    if (path === '/guides') {
      return <GuidesPage />;
    }

    if (path === '/community') {
      return (
        <CommunityPage
          requests={communityRequests}
          votedIds={votedIds}
          onToggleVote={handleToggleVote}
          onAddRequest={handleAddRequest}
        />
      );
    }

    if (path === '/bash') {
      return <BashProtectPage />;
    }

    if (path === '/pricing') {
      return <PricingPage onNavigate={navigate} user={user} />;
    }

    if (path === '/assistant') {
      return <AssistantPage onNavigate={navigate} />;
    }

    if (path === '/login' || path === '/signup') {
      return (
        <AuthPage
          initialMode={path === '/signup' ? 'signup' : 'signin'}
          user={user}
          authLoading={authLoading}
          activeThemeId={themeId}
          onProfileUpdated={(newName) =>
            setUser((prev) => (prev ? { ...prev, username: newName } : prev))
          }
          onNavigate={navigate}
        />
      );
    }

    if (path === '/search') {
      const q = searchQuery.trim().toLowerCase();
      const matchedTools = TOOLS_CATALOG.filter(
        (t) => !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
      const matchedPlugins = plugins.filter(
        (p) =>
          p.status === 'published' &&
          (!q ||
            p.name.toLowerCase().includes(q) ||
            p.tagline.toLowerCase().includes(q) ||
            p.platforms.some((plat) => plat.toLowerCase().includes(q)))
      );
      const matchedResources = resources.filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.platforms.some((p) => p.toLowerCase().includes(q))
      );
      const matchedGuides = GUIDES_CATALOG.filter(
        (g) => !q || g.title.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q)
      );

      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
              Search results {q ? `for "${searchQuery}"` : ''}
            </h1>
            <p className="text-sm mt-1 tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
              {matchedTools.length} tools · {matchedPlugins.length} plugins · {matchedResources.length} mods &amp; resources · {matchedGuides.length} guides
            </p>
          </div>

          {matchedTools.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--st-text)' }}>
                Tools
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {matchedTools.slice(0, 12).map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => navigate(`/tools/${t.slug}`)}
                    className="text-left p-4 st-card st-card-interactive cursor-pointer"
                  >
                    <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                      {t.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--st-text-muted)' }}>
                      {t.description}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {matchedPlugins.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--st-text)' }}>
                Plugins
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {matchedPlugins.slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/plugin/${p.slug}`)}
                    className="text-left p-4 st-card st-card-interactive cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                        {p.name}
                      </span>
                      <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--st-accent-text)' }}>
                        v{p.currentVersion}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--st-text-muted)' }}>
                      {p.tagline}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {matchedResources.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--st-text)' }}>
                Mods &amp; Resources
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {matchedResources.slice(0, 12).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(`/${r.kind}`)}
                    className="text-left p-4 st-card st-card-interactive cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                        {r.name}
                      </span>
                      <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--st-accent-text)' }}>
                        {r.kind === 'resource-packs' ? 'Pack' : r.kind}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--st-text-muted)' }}>
                      {r.summary}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {matchedGuides.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--st-text)' }}>
                Guides
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {matchedGuides.map((g) => (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => navigate('/guides')}
                    className="text-left p-4 st-card st-card-interactive cursor-pointer"
                  >
                    <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                      {g.title}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--st-text-muted)' }}>
                      {g.summary}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {matchedTools.length === 0 && matchedResources.length === 0 && matchedGuides.length === 0 && (
            <div className="st-card p-8 text-center">
              <p className="text-base font-medium" style={{ color: 'var(--st-text)' }}>
                No matches found
              </p>
              <button
                type="button"
                onClick={() => navigate('/tools')}
                className="mt-4 px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
              >
                Browse all tools
              </button>
            </div>
          )}
        </div>
      );
    }

    return <StaticInfoPage path={path} onNavigate={navigate} />;
  };

  return (
    <Layout
      currentPath={currentPath}
      onNavigate={navigate}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
      user={user}
      onLogout={() => {
        void signOut(auth);
      }}
      activeTheme={activeTheme}
      onSelectTheme={handleSelectTheme}
    >
      {renderPage()}
    </Layout>
  );
}
