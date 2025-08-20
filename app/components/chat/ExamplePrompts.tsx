import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Create a mobile app about bolt.diy' },
  { text: 'Build a todo app in React using Tailwind' },
  { text: 'Build a simple blog using Astro' },
  { text: 'Create a cookie consent form using Material UI' },
  { text: 'Make a space invaders game' },
  { text: 'Make a Tic Tac Toe game in html, css and js only' },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="relative mx-auto mt-6 flex w-full max-w-3xl flex-col justify-center gap-9">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="border-bolt-elements-border-color text-bolt-elements-text-secondary transition-theme rounded-full border bg-gray-50 px-3 py-1 text-xs hover:bg-gray-100 hover:text-black dark:bg-gray-950 dark:hover:bg-gray-900"
            >
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
