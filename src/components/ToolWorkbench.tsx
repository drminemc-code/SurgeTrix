import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ADVANCED_TOOLS_CATALOG, TOOLS_CATALOG } from '../data/catalog';
import {
  ColorAndGradientTool,
  EconomyCalculatorTool,
  MotdGeneratorTool,
  PermissionAndCommandTool,
  ServerCheckerTool,
  ServerIconGeneratorTool,
} from './tools/TextAndServerTools';
import {
  MaterialListTool,
  NetherCalculatorTool,
  PlayerIdentityAndGuidesTool,
  SeedMapExplorerTool,
  ShulkerCalculatorTool,
  XpAndTravelTool,
} from './tools/PlayerAndWorldTools';
import {
  DiagnosticsAndAnalyzerTool,
  JsonAndYamlTool,
  TabStudioAndAnimationTool,
} from './tools/DevAndAdvancedTools';
import {
  ArmorTrimStudioTool,
  BannerStudioTool,
  BeaconAndConduitTool,
  DistanceAndChunkTool,
  FireworkDesignerTool,
  RedstoneCalculatorTool,
} from './tools/ExtraMinecraftTools';

interface ToolWorkbenchProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export const ToolWorkbench: React.FC<ToolWorkbenchProps> = ({ slug, onNavigate }) => {
  const stdTool = TOOLS_CATALOG.find((t) => t.slug === slug);
  const advTool = ADVANCED_TOOLS_CATALOG.find((t) => t.slug === slug);

  const title = stdTool?.name || advTool?.name || 'SurgeTrix Tool';
  const description =
    stdTool?.description || advTool?.description || 'Interactive Minecraft utility.';
  const category = stdTool?.category || advTool?.badge || 'Utility';
  const backPath = advTool && !stdTool ? '/advanced-tools' : '/tools';

  const renderToolBody = () => {
    switch (slug) {
      case 'motd':
        return <MotdGeneratorTool />;
      case 'colors':
        return <ColorAndGradientTool mode="colors" />;
      case 'gradient':
        return <ColorAndGradientTool mode="gradient" />;
      case 'converter':
        return <ColorAndGradientTool mode="converter" />;
      case 'font-generator':
        return <ColorAndGradientTool mode="font" />;
      case 'status':
        return <ServerCheckerTool />;
      case 'economy':
        return <EconomyCalculatorTool />;
      case 'permissions':
        return <PermissionAndCommandTool kind="permissions" />;
      case 'commands':
        return <PermissionAndCommandTool kind="commands" />;
      case 'icon':
        return <ServerIconGeneratorTool />;
      case 'nether':
        return <NetherCalculatorTool />;
      case 'shulker':
      case 'storage':
        return <ShulkerCalculatorTool />;
      case 'material':
        return <MaterialListTool />;
      case 'seedmap':
        return <SeedMapExplorerTool />;
      case 'xp':
        return <XpAndTravelTool kind="xp" />;
      case 'elytra':
      case 'traveltime':
        return <XpAndTravelTool kind={slug === 'elytra' ? 'elytra' : 'traveltime'} />;
      case 'firework':
        return <FireworkDesignerTool />;
      case 'redstone':
        return <RedstoneCalculatorTool />;
      case 'armortrim':
        return <ArmorTrimStudioTool />;
      case 'distance':
        return <DistanceAndChunkTool />;
      case 'beacon':
        return <BeaconAndConduitTool />;
      case 'banner':
        return <BannerStudioTool />;
      case 'skin':
      case 'uuid':
      case 'potion':
      case 'villager':
      case 'enchant':
      case 'gear':
      case 'farming':
      case 'mobfarm':
        return <PlayerIdentityAndGuidesTool slug={slug} />;
      case 'json':
        return <JsonAndYamlTool kind="json" />;
      case 'yaml':
        return <JsonAndYamlTool kind="yaml" />;
      case 'tab-placeholder-studio':
        return <TabStudioAndAnimationTool mode="placeholder" />;
      case 'tab-animation-maker':
        return <TabStudioAndAnimationTool mode="animation" />;
      default:
        return <DiagnosticsAndAnalyzerTool slug={slug} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button
        type="button"
        onClick={() => onNavigate(backPath)}
        className="inline-flex items-center gap-2 text-xs font-medium mb-6 cursor-pointer"
        style={{ color: 'var(--st-text-muted)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to {backPath === '/advanced-tools' ? 'Advanced Tools' : 'Tools'}</span>
      </button>

      <div className="mb-8">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--st-accent-text)' }}
        >
          {category}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1" style={{ color: 'var(--st-text)' }}>
          {title}
        </h1>
        <p className="text-[15px] mt-2 max-w-2xl" style={{ color: 'var(--st-text-muted)' }}>
          {description}
        </p>
      </div>

      <div className="st-card p-6 sm:p-7">
        {renderToolBody()}
      </div>
    </div>
  );
};
