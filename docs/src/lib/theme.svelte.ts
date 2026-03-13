export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'bpmn-txt-theme';
const CYCLE: ThemeChoice[] = ['system', 'light', 'dark'];

let choice = $state<ThemeChoice>('system');
let systemDark = $state(false);

export const theme = {
	get choice() { return choice; },
	get resolved() { return choice === 'system' ? (systemDark ? 'dark' : 'light') : choice; },
	get isDark() { return this.resolved === 'dark'; },
};

export function setTheme(next: ThemeChoice) {
	choice = next;
	try { localStorage.setItem(STORAGE_KEY, next); } catch {}
	applyAttribute();
}

export function cycleTheme() {
	const idx = CYCLE.indexOf(choice);
	setTheme(CYCLE[(idx + 1) % CYCLE.length]);
}

export function initTheme() {
	// Read persisted choice
	try {
		const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
		if (stored && CYCLE.includes(stored)) choice = stored;
	} catch {}

	// Track system preference
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	systemDark = mq.matches;
	mq.addEventListener('change', (e) => {
		systemDark = e.matches;
		if (choice === 'system') applyAttribute();
	});

	applyAttribute();
}

function applyAttribute() {
	const resolved = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;
	document.documentElement.setAttribute('data-theme', resolved);
}
