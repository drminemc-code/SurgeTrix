import React from 'react';
import {
  Activity,
  Archive,
  ArrowLeftRight,
  Box,
  Braces,
  Calculator,
  Clock,
  Code2,
  Coins,
  Compass,
  Cpu,
  FileCheck,
  FileCode,
  FileCog,
  Fingerprint,
  Flag,
  Flame,
  FlaskConical,
  GitBranch,
  Image,
  Layers,
  Map,
  MessageSquare,
  Palette,
  Ruler,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Skull,
  Sparkles,
  Sprout,
  Sun,
  Terminal,
  Type,
  User,
  Wand2,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';

export const ToolIcon: React.FC<{ iconKey: string; className?: string }> = ({
  iconKey,
  className = 'w-4 h-4',
}) => {
  switch (iconKey) {
    case 'code':
      return <Code2 className={className} />;
    case 'git-branch':
      return <GitBranch className={className} />;
    case 'activity':
      return <Activity className={className} />;
    case 'file-cog':
      return <FileCog className={className} />;
    case 'file-check':
      return <FileCheck className={className} />;
    case 'type':
      return <Type className={className} />;
    case 'message-square':
      return <MessageSquare className={className} />;
    case 'palette':
      return <Palette className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'arrow-left-right':
      return <ArrowLeftRight className={className} />;
    case 'terminal':
      return <Terminal className={className} />;
    case 'map':
      return <Map className={className} />;
    case 'calculator':
      return <Calculator className={className} />;
    case 'shield-check':
      return <ShieldCheck className={className} />;
    case 'image':
      return <Image className={className} />;
    case 'shield-alert':
      return <ShieldAlert className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'box':
      return <Box className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'user':
      return <User className={className} />;
    case 'fingerprint':
      return <Fingerprint className={className} />;
    case 'braces':
      return <Braces className={className} />;
    case 'file-code':
      return <FileCode className={className} />;
    case 'flask':
      return <FlaskConical className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'wind':
      return <Wind className={className} />;
    case 'clock':
      return <Clock className={className} />;
    case 'coins':
      return <Coins className={className} />;
    case 'wand':
      return <Wand2 className={className} />;
    case 'archive':
      return <Archive className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'sprout':
      return <Sprout className={className} />;
    case 'skull':
      return <Skull className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'shirt':
      return <Shirt className={className} />;
    case 'ruler':
      return <Ruler className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'flag':
      return <Flag className={className} />;
    default:
      return <Wrench className={className} />;
  }
};
