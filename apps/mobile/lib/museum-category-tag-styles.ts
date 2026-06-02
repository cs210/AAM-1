export type CategoryTagVariant = 'default' | 'onImage';

type VariantStyles = {
  container: string;
  text: string;
};

type CategoryStyle = Record<CategoryTagVariant, VariantStyles>;

const FALLBACK: CategoryStyle = {
  default: {
    container: 'border-border bg-muted',
    text: 'text-foreground',
  },
  onImage: {
    container: 'border-white/30 bg-white/20',
    text: 'text-white',
  },
};

/** Per-type chip colors — keys match museum `category` slugs from the dashboard form. */
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  art: {
    default: {
      container: 'border-rose-200 bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40',
      text: 'text-rose-900 dark:text-rose-200',
    },
    onImage: {
      container: 'border-rose-200/50 bg-rose-500/35',
      text: 'text-white',
    },
  },
  contemporary: {
    default: {
      container: 'border-violet-200 bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/40',
      text: 'text-violet-900 dark:text-violet-200',
    },
    onImage: {
      container: 'border-violet-200/50 bg-violet-500/35',
      text: 'text-white',
    },
  },
  history: {
    default: {
      container: 'border-amber-200 bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40',
      text: 'text-amber-950 dark:text-amber-200',
    },
    onImage: {
      container: 'border-amber-200/50 bg-amber-600/35',
      text: 'text-white',
    },
  },
  science: {
    default: {
      container: 'border-sky-200 bg-sky-100 dark:border-sky-900/50 dark:bg-sky-950/40',
      text: 'text-sky-950 dark:text-sky-200',
    },
    onImage: {
      container: 'border-sky-200/50 bg-sky-500/35',
      text: 'text-white',
    },
  },
  'natural-history': {
    default: {
      container: 'border-emerald-200 bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40',
      text: 'text-emerald-950 dark:text-emerald-200',
    },
    onImage: {
      container: 'border-emerald-200/50 bg-emerald-600/35',
      text: 'text-white',
    },
  },
  children: {
    default: {
      container: 'border-yellow-200 bg-yellow-100 dark:border-yellow-900/50 dark:bg-yellow-950/40',
      text: 'text-yellow-950 dark:text-yellow-200',
    },
    onImage: {
      container: 'border-yellow-200/50 bg-yellow-500/35',
      text: 'text-white',
    },
  },
  design: {
    default: {
      container: 'border-indigo-200 bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40',
      text: 'text-indigo-950 dark:text-indigo-200',
    },
    onImage: {
      container: 'border-indigo-200/50 bg-indigo-500/35',
      text: 'text-white',
    },
  },
  photography: {
    default: {
      container: 'border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60',
      text: 'text-zinc-900 dark:text-zinc-200',
    },
    onImage: {
      container: 'border-zinc-200/50 bg-zinc-600/40',
      text: 'text-white',
    },
  },
  culture: {
    default: {
      container: 'border-teal-200 bg-teal-100 dark:border-teal-900/50 dark:bg-teal-950/40',
      text: 'text-teal-950 dark:text-teal-200',
    },
    onImage: {
      container: 'border-teal-200/50 bg-teal-600/35',
      text: 'text-white',
    },
  },
  specialty: {
    default: {
      container: 'border-fuchsia-200 bg-fuchsia-100 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/40',
      text: 'text-fuchsia-950 dark:text-fuchsia-200',
    },
    onImage: {
      container: 'border-fuchsia-200/50 bg-fuchsia-500/35',
      text: 'text-white',
    },
  },
};

export function getCategoryTagStyles(
  category: string,
  variant: CategoryTagVariant = 'default'
): VariantStyles {
  const key = category.trim().toLowerCase();
  return (CATEGORY_STYLES[key] ?? FALLBACK)[variant];
}
