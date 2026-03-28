const adjectives = [
	"Bright",
	"Swift",
	"Calm",
	"Bold",
	"Keen",
	"Warm",
	"Cool",
	"Sharp",
	"Quick",
	"Zen",
	"Chill",
	"Steady",
	"Lively",
	"Mellow",
	"Clever",
	"Witty",
	"Noble",
	"Lucky",
	"Sunny",
	"Cosmic",
];

const nouns = [
	"Falcon",
	"Panda",
	"Phoenix",
	"Otter",
	"Sparrow",
	"Dolphin",
	"Fox",
	"Owl",
	"Wolf",
	"Hawk",
	"Lynx",
	"Raven",
	"Bear",
	"Tiger",
	"Robin",
	"Heron",
	"Eagle",
	"Koala",
	"Moose",
	"Osprey",
];

export function generateUsername(): string {
	const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	return `${adjective} ${noun}`;
}
