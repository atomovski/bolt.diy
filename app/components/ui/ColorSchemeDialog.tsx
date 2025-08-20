import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogDescription, DialogRoot } from './Dialog';
import { Button } from './Button';
import { IconButton } from './IconButton';
import type { DesignScheme } from '~/types/design-scheme';
import { defaultDesignScheme, designFeatures, designFonts, paletteRoles } from '~/types/design-scheme';
import { Icon } from '~/components/ui';

export interface ColorSchemeDialogProps {
  designScheme?: DesignScheme;
  setDesignScheme?: (scheme: DesignScheme) => void;
}

export const ColorSchemeDialog: React.FC<ColorSchemeDialogProps> = ({ setDesignScheme, designScheme }) => {
  const [palette, setPalette] = useState<{ [key: string]: string }>(() => {
    if (designScheme?.palette) {
      return { ...defaultDesignScheme.palette, ...designScheme.palette };
    }

    return defaultDesignScheme.palette;
  });

  const [features, setFeatures] = useState<string[]>(designScheme?.features || defaultDesignScheme.features);
  const [font, setFont] = useState<string[]>(designScheme?.font || defaultDesignScheme.font);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'colors' | 'typography' | 'features'>('colors');

  useEffect(() => {
    if (designScheme) {
      setPalette(() => ({ ...defaultDesignScheme.palette, ...designScheme.palette }));
      setFeatures(designScheme.features || defaultDesignScheme.features);
      setFont(designScheme.font || defaultDesignScheme.font);
    } else {
      setPalette(defaultDesignScheme.palette);
      setFeatures(defaultDesignScheme.features);
      setFont(defaultDesignScheme.font);
    }
  }, [designScheme]);

  const handleColorChange = (role: string, value: string) => {
    setPalette((prev) => ({ ...prev, [role]: value }));
  };

  const handleFeatureToggle = (key: string) => {
    setFeatures((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const handleFontToggle = (key: string) => {
    setFont((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const handleSave = () => {
    setDesignScheme?.({ palette, features, font });
    setIsDialogOpen(false);
  };

  const handleReset = () => {
    setPalette(defaultDesignScheme.palette);
    setFeatures(defaultDesignScheme.features);
    setFont(defaultDesignScheme.font);
  };

  const renderColorSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
          <div className="bg-bolt-elements-item-contentAccent h-2 w-2 rounded-full"></div>
          Color Palette
        </h3>
        <button
          onClick={handleReset}
          className="hover:bg-bolt-elements-bg-depth-2 text-bolt-elements-text-secondary flex items-center gap-2 rounded-lg bg-transparent text-sm transition-all duration-200 hover:text-black"
        >
          <span className="i-ph:arrow-clockwise text-sm" />
          Reset
        </button>
      </div>

      <div className="custom-scrollbar grid max-h-80 grid-cols-1 gap-3 overflow-y-auto pr-2 md:grid-cols-2">
        {paletteRoles.map((role) => (
          <div
            key={role.key}
            className="group bg-bolt-elements-bg-depth-3 hover:bg-bolt-elements-bg-depth-2 hover:border-bolt-elements-border-color flex items-center gap-4 rounded-xl border border-transparent p-4 transition-all duration-200"
          >
            <div className="relative shrink-0">
              <div
                className="hover:ring-bolt-elements-border-color-active h-12 w-12 cursor-pointer rounded-xl shadow-md ring-2 ring-transparent transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: palette[role.key] }}
                onClick={() => document.getElementById(`color-input-${role.key}`)?.click()}
                role="button"
                tabIndex={0}
                aria-label={`Change ${role.label} color`}
              />
              <input
                id={`color-input-${role.key}`}
                type="color"
                value={palette[role.key]}
                onChange={(e) => handleColorChange(role.key, e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                tabIndex={-1}
              />
              <div className="bg-bolt-elements-bg-depth-1 absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full shadow-xs">
                <span className="i-ph:pencil-simple text-bolt-elements-text-secondary text-xs" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-black transition-colors">{role.label}</div>
              <div className="text-bolt-elements-text-secondary line-clamp-2 text-sm leading-relaxed">
                {role.description}
              </div>
              <div className="text-bolt-elements-text-tertiary bg-bolt-elements-bg-depth-1 mt-1 inline-block rounded-md px-2 py-1 font-mono text-xs">
                {palette[role.key]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTypographySection = () => (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
        <div className="bg-bolt-elements-item-contentAccent h-2 w-2 rounded-full"></div>
        Typography
      </h3>

      <div className="custom-scrollbar grid max-h-80 grid-cols-1 gap-3 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3">
        {designFonts.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => handleFontToggle(f.key)}
            className={`group focus:ring-bolt-elements-border-color-active rounded-xl border-2 p-4 transition-all duration-200 focus:ring-2 focus:outline-hidden ${
              font.includes(f.key)
                ? 'bg-bolt-elements-item-backgroundAccent border-bolt-elements-border-color-active shadow-lg'
                : 'bg-darken-50 border-bolt-elements-border-color hover:border-bolt-elements-border-color-active hover:bg-bolt-elements-bg-depth-2'
            }`}
          >
            <div className="space-y-2 text-center">
              <div
                className={`text-2xl font-medium transition-colors ${
                  font.includes(f.key) ? 'text-bolt-elements-item-contentAccent' : 'text-black'
                }`}
                style={{ fontFamily: f.key }}
              >
                {f.preview}
              </div>
              <div
                className={`text-sm font-medium transition-colors ${
                  font.includes(f.key) ? 'text-bolt-elements-item-contentAccent' : 'text-bolt-elements-text-secondary'
                }`}
              >
                {f.label}
              </div>
              {font.includes(f.key) && (
                <div className="bg-bolt-elements-item-contentAccent mx-auto flex h-6 w-6 items-center justify-center rounded-full">
                  <span className="i-ph:check text-sm text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderFeaturesSection = () => (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-black">
        <div className="bg-bolt-elements-item-contentAccent h-2 w-2 rounded-full"></div>
        Design Features
      </h3>

      <div className="custom-scrollbar grid max-h-80 grid-cols-1 gap-4 overflow-y-auto pr-2 sm:grid-cols-2">
        {designFeatures.map((f) => {
          const isSelected = features.includes(f.key);

          return (
            <div key={f.key} className="feature-card-container p-2">
              <button
                type="button"
                onClick={() => handleFeatureToggle(f.key)}
                className={`group bg-darken-50 text-bolt-elements-item-textSecondary relative w-full p-6 text-sm font-medium transition-all duration-200 ${
                  f.key === 'rounded-sm'
                    ? isSelected
                      ? 'rounded-3xl'
                      : 'rounded-xl'
                    : f.key === 'border'
                      ? 'rounded-lg'
                      : 'rounded-xl'
                } ${
                  f.key === 'border'
                    ? isSelected
                      ? 'border-bolt-elements-border-color-active bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent border-3'
                      : 'border-bolt-elements-border-color hover:border-bolt-elements-border-color-active text-bolt-elements-text-secondary border-2'
                    : f.key === 'gradient'
                      ? ''
                      : isSelected
                        ? 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent shadow-lg'
                        : 'bg-bolt-elements-bg-depth-3 hover:bg-bolt-elements-bg-depth-2 text-bolt-elements-text-secondary hover:text-black'
                } ${f.key === 'shadow-sm' ? (isSelected ? 'shadow-xl' : 'shadow-lg') : 'shadow-md'}`}
                style={{
                  ...(f.key === 'gradient' && {
                    background: isSelected
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'var(--bolt-elements-bg-depth-3)',
                    color: isSelected ? 'white' : 'var(--bolt-elements-textSecondary)',
                  }),
                }}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-bolt-elements-bg-depth-1 bg-opacity-20 flex h-12 w-12 items-center justify-center rounded-xl">
                    {f.key === 'rounded-sm' && (
                      <div
                        className={`h-6 w-6 bg-current transition-all duration-200 ${
                          isSelected ? 'rounded-full' : 'rounded-sm'
                        } opacity-80`}
                      />
                    )}
                    {f.key === 'border' && (
                      <div
                        className={`h-6 w-6 rounded-lg transition-all duration-200 ${
                          isSelected ? 'border-3 border-current opacity-90' : 'border-2 border-current opacity-70'
                        }`}
                      />
                    )}
                    {f.key === 'gradient' && (
                      <div className="h-6 w-6 rounded-lg bg-linear-to-br from-purple-400 via-pink-400 to-indigo-400 opacity-90" />
                    )}
                    {f.key === 'shadow-sm' && (
                      <div className="relative">
                        <div
                          className={`h-6 w-6 rounded-lg bg-current transition-all duration-200 ${
                            isSelected ? 'opacity-90' : 'opacity-70'
                          }`}
                        />
                        <div
                          className={`absolute top-1 left-1 h-6 w-6 rounded-lg bg-current transition-all duration-200 ${
                            isSelected ? 'opacity-40' : 'opacity-30'
                          }`}
                        />
                      </div>
                    )}
                    {f.key === 'frosted-glass' && (
                      <div className="relative">
                        <div
                          className={`h-6 w-6 rounded-lg border border-white/30 bg-white/20 backdrop-blur-xs transition-all duration-200 ${
                            isSelected ? 'opacity-90' : 'opacity-70'
                          }`}
                        />
                        <div
                          className={`absolute inset-0 h-6 w-6 rounded-lg bg-linear-to-br from-white/10 to-transparent backdrop-blur-md transition-all duration-200 ${
                            isSelected ? 'opacity-60' : 'opacity-40'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="font-semibold">{f.label}</div>
                    {isSelected && <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-current opacity-60" />}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <IconButton title="Design Palette" className="transition-all" onClick={() => setIsDialogOpen(!isDialogOpen)}>
        <Icon.Palette className="size-5" />
      </IconButton>

      <DialogRoot open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog>
          <div className="flex max-h-[85vh] max-w-[90vw] min-w-[480px] flex-col gap-6 overflow-hidden px-4 py-4">
            <div className="">
              <DialogTitle className="text-2xl font-bold text-black">Design Palette & Features</DialogTitle>
              <DialogDescription className="text-bolt-elements-text-secondary leading-relaxed">
                Customize your color palette, typography, and design features. These preferences will guide the AI in
                creating designs that match your style.
              </DialogDescription>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-bolt-elements-bg-depth-3 flex gap-1 rounded-xl p-1">
              {[
                { key: 'colors', label: 'Colors', icon: 'i-ph:palette' },
                { key: 'typography', label: 'Typography', icon: 'i-ph:text-aa' },
                { key: 'features', label: 'Features', icon: 'i-ph:magic-wand' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key as any)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
                    activeSection === tab.key
                      ? 'bg-darken-50 text-black shadow-md'
                      : 'bg-bolt-elements-background-depth-2 text-bolt-elements-text-secondary hover:bg-bolt-elements-bg-depth-2 hover:text-black'
                  }`}
                >
                  <span className={`${tab.icon} text-lg`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="min-h-92 overflow-y-auto">
              {activeSection === 'colors' && renderColorSection()}
              {activeSection === 'typography' && renderTypographySection()}
              {activeSection === 'features' && renderFeaturesSection()}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="text-bolt-elements-text-secondary text-sm">
                {Object.keys(palette).length} colors • {font.length} fonts • {features.length} features
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSave}
                  className="bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-background-hover text-bolt-elements-button-primary-text"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      </DialogRoot>

      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: var(--bolt-elements-textTertiary) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--bolt-elements-textTertiary);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--bolt-elements-textSecondary);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .feature-card-container {
          min-height: 140px;
          display: flex;
          align-items: stretch;
        }
        .feature-card-container button {
          flex: 1;
        }
      `}</style>
    </div>
  );
};
