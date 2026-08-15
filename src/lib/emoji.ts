export type Emoji = { char: string; name: string; keywords: string; group: EmojiGroup }

export type EmojiGroup =
  | 'Smileys'
  | 'People'
  | 'Nature'
  | 'Food'
  | 'Travel'
  | 'Activity'
  | 'Objects'
  | 'Symbols'
  | 'Flags'

export const EMOJI_GROUPS: EmojiGroup[] = [
  'Smileys', 'People', 'Nature', 'Food', 'Travel', 'Activity', 'Objects', 'Symbols', 'Flags',
]

/**
 * A curated set rather than the full 3,700-emoji Unicode table: this covers
 * what people actually reach for, keeps the bundle small, and lets every entry
 * carry hand-written search keywords instead of the official CLDR names, which
 * are often useless to search ("grinning face with smiling eyes").
 */
export const EMOJI: Emoji[] = [
  // Smileys
  { char: '😀', name: 'Grinning', keywords: 'smile happy grin joy', group: 'Smileys' },
  { char: '😃', name: 'Grinning big eyes', keywords: 'smile happy joy', group: 'Smileys' },
  { char: '😄', name: 'Grinning smiling eyes', keywords: 'smile happy laugh', group: 'Smileys' },
  { char: '😁', name: 'Beaming', keywords: 'smile grin teeth', group: 'Smileys' },
  { char: '😆', name: 'Squinting laugh', keywords: 'laugh haha lol', group: 'Smileys' },
  { char: '😅', name: 'Sweat smile', keywords: 'relief phew nervous laugh', group: 'Smileys' },
  { char: '🤣', name: 'Rolling on floor', keywords: 'rofl lmao laugh hilarious', group: 'Smileys' },
  { char: '😂', name: 'Tears of joy', keywords: 'lol cry laugh funny', group: 'Smileys' },
  { char: '🙂', name: 'Slight smile', keywords: 'smile polite fine', group: 'Smileys' },
  { char: '🙃', name: 'Upside down', keywords: 'irony sarcasm silly', group: 'Smileys' },
  { char: '😉', name: 'Wink', keywords: 'flirt joke', group: 'Smileys' },
  { char: '😊', name: 'Smiling blush', keywords: 'happy shy warm thanks', group: 'Smileys' },
  { char: '🥰', name: 'Smiling hearts', keywords: 'love adore affection', group: 'Smileys' },
  { char: '😍', name: 'Heart eyes', keywords: 'love crush amazing', group: 'Smileys' },
  { char: '🤩', name: 'Star struck', keywords: 'wow amazing excited', group: 'Smileys' },
  { char: '😘', name: 'Blowing kiss', keywords: 'love kiss', group: 'Smileys' },
  { char: '😋', name: 'Savouring', keywords: 'yum tasty delicious', group: 'Smileys' },
  { char: '😜', name: 'Winking tongue', keywords: 'joke silly playful', group: 'Smileys' },
  { char: '🤪', name: 'Zany', keywords: 'crazy wild silly', group: 'Smileys' },
  { char: '🤨', name: 'Raised eyebrow', keywords: 'suspicious doubt really', group: 'Smileys' },
  { char: '🧐', name: 'Monocle', keywords: 'inspect curious examine', group: 'Smileys' },
  { char: '🤓', name: 'Nerd', keywords: 'geek smart glasses', group: 'Smileys' },
  { char: '😎', name: 'Sunglasses', keywords: 'cool awesome', group: 'Smileys' },
  { char: '🥳', name: 'Partying', keywords: 'celebrate birthday party', group: 'Smileys' },
  { char: '😏', name: 'Smirk', keywords: 'smug sly', group: 'Smileys' },
  { char: '😒', name: 'Unamused', keywords: 'meh annoyed unimpressed', group: 'Smileys' },
  { char: '😔', name: 'Pensive', keywords: 'sad down thoughtful', group: 'Smileys' },
  { char: '😴', name: 'Sleeping', keywords: 'sleep tired zzz bored', group: 'Smileys' },
  { char: '🤤', name: 'Drooling', keywords: 'hungry want desire', group: 'Smileys' },
  { char: '😭', name: 'Loudly crying', keywords: 'sob cry sad tears', group: 'Smileys' },
  { char: '😤', name: 'Steam from nose', keywords: 'determined proud angry', group: 'Smileys' },
  { char: '😡', name: 'Pouting', keywords: 'angry mad rage', group: 'Smileys' },
  { char: '🤯', name: 'Mind blown', keywords: 'shocked wow exploding head', group: 'Smileys' },
  { char: '😱', name: 'Screaming', keywords: 'shock fear scared', group: 'Smileys' },
  { char: '😳', name: 'Flushed', keywords: 'embarrassed surprise blush', group: 'Smileys' },
  { char: '🥺', name: 'Pleading', keywords: 'puppy eyes please beg', group: 'Smileys' },
  { char: '😢', name: 'Crying', keywords: 'sad tear upset', group: 'Smileys' },
  { char: '🤔', name: 'Thinking', keywords: 'hmm consider question', group: 'Smileys' },
  { char: '🤗', name: 'Hugging', keywords: 'hug welcome warm', group: 'Smileys' },
  { char: '🤫', name: 'Shushing', keywords: 'quiet secret shh', group: 'Smileys' },
  { char: '😬', name: 'Grimacing', keywords: 'awkward yikes eek', group: 'Smileys' },
  { char: '🙄', name: 'Rolling eyes', keywords: 'annoyed whatever', group: 'Smileys' },
  { char: '😐', name: 'Neutral', keywords: 'meh blank deadpan', group: 'Smileys' },
  { char: '🥲', name: 'Smiling tear', keywords: 'bittersweet proud touched', group: 'Smileys' },
  { char: '😇', name: 'Halo', keywords: 'innocent angel good', group: 'Smileys' },
  { char: '🤐', name: 'Zipper mouth', keywords: 'silence secret quiet', group: 'Smileys' },
  { char: '🤢', name: 'Nauseated', keywords: 'sick gross disgust', group: 'Smileys' },
  { char: '🥵', name: 'Hot face', keywords: 'heat sweating overheated', group: 'Smileys' },
  { char: '🥶', name: 'Cold face', keywords: 'freezing chill', group: 'Smileys' },
  { char: '💀', name: 'Skull', keywords: 'dead dying funny lol', group: 'Smileys' },
  { char: '👻', name: 'Ghost', keywords: 'boo spooky halloween', group: 'Smileys' },
  { char: '🤖', name: 'Robot', keywords: 'bot ai machine', group: 'Smileys' },
  { char: '💩', name: 'Pile of poo', keywords: 'poop bad crap', group: 'Smileys' },

  // People
  { char: '👋', name: 'Waving hand', keywords: 'hello hi bye wave', group: 'People' },
  { char: '🤝', name: 'Handshake', keywords: 'deal agree partner', group: 'People' },
  { char: '👍', name: 'Thumbs up', keywords: 'yes good approve like ok', group: 'People' },
  { char: '👎', name: 'Thumbs down', keywords: 'no bad disapprove', group: 'People' },
  { char: '👏', name: 'Clapping', keywords: 'applause bravo well done', group: 'People' },
  { char: '🙌', name: 'Raising hands', keywords: 'celebrate praise hooray', group: 'People' },
  { char: '🙏', name: 'Folded hands', keywords: 'please thanks pray namaste', group: 'People' },
  { char: '💪', name: 'Flexed biceps', keywords: 'strong strength gym', group: 'People' },
  { char: '🤞', name: 'Crossed fingers', keywords: 'luck hope wish', group: 'People' },
  { char: '👌', name: 'OK hand', keywords: 'ok perfect good', group: 'People' },
  { char: '✌️', name: 'Victory', keywords: 'peace two v', group: 'People' },
  { char: '🫶', name: 'Heart hands', keywords: 'love thanks appreciate', group: 'People' },
  { char: '👀', name: 'Eyes', keywords: 'look watch see attention', group: 'People' },
  { char: '🧠', name: 'Brain', keywords: 'smart think mind', group: 'People' },
  { char: '👶', name: 'Baby', keywords: 'child infant new', group: 'People' },
  { char: '🧑‍💻', name: 'Technologist', keywords: 'developer coder programmer', group: 'People' },
  { char: '🧑‍🎨', name: 'Artist', keywords: 'designer creative paint', group: 'People' },
  { char: '🕺', name: 'Dancing', keywords: 'dance party celebrate', group: 'People' },
  { char: '🦸', name: 'Superhero', keywords: 'hero save power', group: 'People' },

  // Nature
  { char: '🐶', name: 'Dog', keywords: 'puppy pet animal', group: 'Nature' },
  { char: '🐱', name: 'Cat', keywords: 'kitten pet animal', group: 'Nature' },
  { char: '🦊', name: 'Fox', keywords: 'animal clever', group: 'Nature' },
  { char: '🐻', name: 'Bear', keywords: 'animal', group: 'Nature' },
  { char: '🐼', name: 'Panda', keywords: 'animal bamboo', group: 'Nature' },
  { char: '🦁', name: 'Lion', keywords: 'animal king brave', group: 'Nature' },
  { char: '🐘', name: 'Elephant', keywords: 'animal big memory', group: 'Nature' },
  { char: '🦋', name: 'Butterfly', keywords: 'insect transform pretty', group: 'Nature' },
  { char: '🐝', name: 'Bee', keywords: 'insect honey busy', group: 'Nature' },
  { char: '🌱', name: 'Seedling', keywords: 'plant grow new start', group: 'Nature' },
  { char: '🌳', name: 'Tree', keywords: 'nature forest green', group: 'Nature' },
  { char: '🌸', name: 'Cherry blossom', keywords: 'flower spring pink', group: 'Nature' },
  { char: '🌻', name: 'Sunflower', keywords: 'flower yellow summer', group: 'Nature' },
  { char: '🌈', name: 'Rainbow', keywords: 'colour pride hope', group: 'Nature' },
  { char: '☀️', name: 'Sun', keywords: 'sunny weather hot day', group: 'Nature' },
  { char: '🌙', name: 'Crescent moon', keywords: 'night sleep dark', group: 'Nature' },
  { char: '⭐', name: 'Star', keywords: 'favourite rating night', group: 'Nature' },
  { char: '⚡', name: 'Lightning', keywords: 'fast power electric zap', group: 'Nature' },
  { char: '🔥', name: 'Fire', keywords: 'hot lit awesome burn trending', group: 'Nature' },
  { char: '❄️', name: 'Snowflake', keywords: 'cold winter freeze', group: 'Nature' },
  { char: '🌊', name: 'Wave', keywords: 'ocean sea water', group: 'Nature' },
  { char: '💧', name: 'Droplet', keywords: 'water drop liquid', group: 'Nature' },

  // Food
  { char: '🍎', name: 'Apple', keywords: 'fruit red healthy', group: 'Food' },
  { char: '🍌', name: 'Banana', keywords: 'fruit yellow', group: 'Food' },
  { char: '🍕', name: 'Pizza', keywords: 'food slice italian', group: 'Food' },
  { char: '🍔', name: 'Burger', keywords: 'food fast beef', group: 'Food' },
  { char: '🍟', name: 'Fries', keywords: 'food chips fast', group: 'Food' },
  { char: '🌮', name: 'Taco', keywords: 'food mexican', group: 'Food' },
  { char: '🍜', name: 'Noodles', keywords: 'ramen food soup asian', group: 'Food' },
  { char: '🍛', name: 'Curry rice', keywords: 'food indian spicy', group: 'Food' },
  { char: '🍰', name: 'Cake slice', keywords: 'dessert birthday sweet', group: 'Food' },
  { char: '🍫', name: 'Chocolate', keywords: 'sweet dessert treat', group: 'Food' },
  { char: '☕', name: 'Coffee', keywords: 'hot drink caffeine morning', group: 'Food' },
  { char: '🍵', name: 'Tea', keywords: 'hot drink chai green', group: 'Food' },
  { char: '🍺', name: 'Beer', keywords: 'drink alcohol pub cheers', group: 'Food' },
  { char: '🥂', name: 'Clinking glasses', keywords: 'cheers celebrate toast', group: 'Food' },
  { char: '🎂', name: 'Birthday cake', keywords: 'birthday celebrate party', group: 'Food' },

  // Travel
  { char: '🚗', name: 'Car', keywords: 'drive vehicle auto', group: 'Travel' },
  { char: '🚕', name: 'Taxi', keywords: 'cab ride', group: 'Travel' },
  { char: '🚌', name: 'Bus', keywords: 'transport public', group: 'Travel' },
  { char: '🚆', name: 'Train', keywords: 'rail transport commute', group: 'Travel' },
  { char: '✈️', name: 'Aeroplane', keywords: 'flight travel fly airport', group: 'Travel' },
  { char: '🚀', name: 'Rocket', keywords: 'launch fast ship space startup', group: 'Travel' },
  { char: '🛵', name: 'Scooter', keywords: 'delivery ride moped', group: 'Travel' },
  { char: '🚲', name: 'Bicycle', keywords: 'bike cycle ride', group: 'Travel' },
  { char: '🏠', name: 'House', keywords: 'home building live', group: 'Travel' },
  { char: '🏢', name: 'Office', keywords: 'building work company', group: 'Travel' },
  { char: '🗺️', name: 'World map', keywords: 'travel geography location', group: 'Travel' },
  { char: '📍', name: 'Pin', keywords: 'location place here map', group: 'Travel' },
  { char: '🏝️', name: 'Island', keywords: 'holiday beach tropical', group: 'Travel' },
  { char: '🗿', name: 'Moai', keywords: 'statue stone deadpan', group: 'Travel' },

  // Activity
  { char: '⚽', name: 'Football', keywords: 'soccer sport ball', group: 'Activity' },
  { char: '🏏', name: 'Cricket', keywords: 'sport bat ball india', group: 'Activity' },
  { char: '🏀', name: 'Basketball', keywords: 'sport ball hoop', group: 'Activity' },
  { char: '🎮', name: 'Game controller', keywords: 'gaming play video', group: 'Activity' },
  { char: '🎯', name: 'Bullseye', keywords: 'target goal aim focus', group: 'Activity' },
  { char: '🏆', name: 'Trophy', keywords: 'win award champion first', group: 'Activity' },
  { char: '🥇', name: 'Gold medal', keywords: 'first win award', group: 'Activity' },
  { char: '🎉', name: 'Party popper', keywords: 'celebrate congrats launch', group: 'Activity' },
  { char: '🎊', name: 'Confetti', keywords: 'celebrate party', group: 'Activity' },
  { char: '🎁', name: 'Gift', keywords: 'present birthday reward', group: 'Activity' },
  { char: '🎵', name: 'Musical note', keywords: 'music song audio', group: 'Activity' },
  { char: '🎬', name: 'Clapper board', keywords: 'film movie video action', group: 'Activity' },
  { char: '🎨', name: 'Palette', keywords: 'art design paint colour', group: 'Activity' },
  { char: '📸', name: 'Camera flash', keywords: 'photo picture snap', group: 'Activity' },

  // Objects
  { char: '💻', name: 'Laptop', keywords: 'computer work code dev', group: 'Objects' },
  { char: '🖥️', name: 'Desktop', keywords: 'computer monitor screen', group: 'Objects' },
  { char: '📱', name: 'Mobile phone', keywords: 'smartphone app mobile', group: 'Objects' },
  { char: '⌨️', name: 'Keyboard', keywords: 'type input keys', group: 'Objects' },
  { char: '🖱️', name: 'Mouse', keywords: 'click pointer input', group: 'Objects' },
  { char: '💾', name: 'Floppy disk', keywords: 'save storage retro', group: 'Objects' },
  { char: '🔋', name: 'Battery', keywords: 'power charge energy', group: 'Objects' },
  { char: '🔌', name: 'Plug', keywords: 'power electric connect', group: 'Objects' },
  { char: '💡', name: 'Light bulb', keywords: 'idea tip insight bright', group: 'Objects' },
  { char: '🔒', name: 'Locked', keywords: 'secure private safe', group: 'Objects' },
  { char: '🔓', name: 'Unlocked', keywords: 'open access insecure', group: 'Objects' },
  { char: '🔑', name: 'Key', keywords: 'access password unlock', group: 'Objects' },
  { char: '🔍', name: 'Magnifying glass', keywords: 'search find zoom look', group: 'Objects' },
  { char: '📊', name: 'Bar chart', keywords: 'data stats graph analytics', group: 'Objects' },
  { char: '📈', name: 'Chart up', keywords: 'growth increase profit trend', group: 'Objects' },
  { char: '📉', name: 'Chart down', keywords: 'decline loss decrease', group: 'Objects' },
  { char: '📅', name: 'Calendar', keywords: 'date schedule plan', group: 'Objects' },
  { char: '📌', name: 'Pushpin', keywords: 'pin important note', group: 'Objects' },
  { char: '📎', name: 'Paperclip', keywords: 'attach file clip', group: 'Objects' },
  { char: '✂️', name: 'Scissors', keywords: 'cut trim snip', group: 'Objects' },
  { char: '🗑️', name: 'Wastebasket', keywords: 'delete trash bin remove', group: 'Objects' },
  { char: '📦', name: 'Package', keywords: 'box ship delivery release', group: 'Objects' },
  { char: '💰', name: 'Money bag', keywords: 'cash rich profit', group: 'Objects' },
  { char: '💳', name: 'Credit card', keywords: 'pay money bank', group: 'Objects' },
  { char: '🧾', name: 'Receipt', keywords: 'invoice bill expense', group: 'Objects' },
  { char: '📝', name: 'Memo', keywords: 'write note edit form', group: 'Objects' },
  { char: '📚', name: 'Books', keywords: 'read study learn library', group: 'Objects' },
  { char: '🔗', name: 'Link', keywords: 'url chain connect', group: 'Objects' },
  { char: '🧰', name: 'Toolbox', keywords: 'tools kit utility fix', group: 'Objects' },
  { char: '🔧', name: 'Wrench', keywords: 'fix tool repair settings', group: 'Objects' },
  { char: '🐛', name: 'Bug', keywords: 'error issue defect insect', group: 'Objects' },
  { char: '🧪', name: 'Test tube', keywords: 'experiment science test', group: 'Objects' },
  { char: '⏰', name: 'Alarm clock', keywords: 'time wake reminder', group: 'Objects' },
  { char: '⏳', name: 'Hourglass', keywords: 'time wait loading', group: 'Objects' },

  // Symbols
  { char: '❤️', name: 'Red heart', keywords: 'love like favourite', group: 'Symbols' },
  { char: '🧡', name: 'Orange heart', keywords: 'love warm', group: 'Symbols' },
  { char: '💚', name: 'Green heart', keywords: 'love nature eco', group: 'Symbols' },
  { char: '💙', name: 'Blue heart', keywords: 'love trust calm', group: 'Symbols' },
  { char: '💜', name: 'Purple heart', keywords: 'love creative', group: 'Symbols' },
  { char: '🖤', name: 'Black heart', keywords: 'love dark', group: 'Symbols' },
  { char: '💔', name: 'Broken heart', keywords: 'sad breakup hurt', group: 'Symbols' },
  { char: '✅', name: 'Check mark', keywords: 'done yes complete tick pass', group: 'Symbols' },
  { char: '❌', name: 'Cross mark', keywords: 'no wrong fail delete', group: 'Symbols' },
  { char: '⚠️', name: 'Warning', keywords: 'caution alert careful', group: 'Symbols' },
  { char: '🚫', name: 'Prohibited', keywords: 'no ban forbidden stop', group: 'Symbols' },
  { char: '❓', name: 'Question mark', keywords: 'help ask unknown', group: 'Symbols' },
  { char: '❗', name: 'Exclamation', keywords: 'important alert attention', group: 'Symbols' },
  { char: '💯', name: 'Hundred', keywords: 'perfect score agree full', group: 'Symbols' },
  { char: '✨', name: 'Sparkles', keywords: 'new shiny magic clean ai', group: 'Symbols' },
  { char: '⚙️', name: 'Gear', keywords: 'settings config options', group: 'Symbols' },
  { char: '♻️', name: 'Recycling', keywords: 'eco reuse green', group: 'Symbols' },
  { char: '🔔', name: 'Bell', keywords: 'notification alert reminder', group: 'Symbols' },
  { char: '🔕', name: 'Bell muted', keywords: 'silent mute notification off', group: 'Symbols' },
  { char: '➡️', name: 'Right arrow', keywords: 'next forward direction', group: 'Symbols' },
  { char: '⬅️', name: 'Left arrow', keywords: 'back previous direction', group: 'Symbols' },
  { char: '🔄', name: 'Refresh', keywords: 'reload sync repeat update', group: 'Symbols' },
  { char: '🆕', name: 'New', keywords: 'new fresh badge', group: 'Symbols' },
  { char: '🔝', name: 'Top', keywords: 'up best top', group: 'Symbols' },

  // Flags
  { char: '🏳️', name: 'White flag', keywords: 'surrender peace', group: 'Flags' },
  { char: '🏴', name: 'Black flag', keywords: 'pirate dark', group: 'Flags' },
  { char: '🏁', name: 'Chequered flag', keywords: 'finish race done start', group: 'Flags' },
  { char: '🚩', name: 'Triangular flag', keywords: 'red flag warning issue', group: 'Flags' },
  { char: '🏳️‍🌈', name: 'Rainbow flag', keywords: 'pride lgbtq', group: 'Flags' },
  { char: '🇮🇳', name: 'India', keywords: 'flag india bharat', group: 'Flags' },
  { char: '🇺🇸', name: 'United States', keywords: 'flag usa america', group: 'Flags' },
  { char: '🇬🇧', name: 'United Kingdom', keywords: 'flag uk britain', group: 'Flags' },
  { char: '🇯🇵', name: 'Japan', keywords: 'flag japan', group: 'Flags' },
  { char: '🇩🇪', name: 'Germany', keywords: 'flag germany', group: 'Flags' },
]

export type Kaomoji = { text: string; name: string; keywords: string }

export const KAOMOJI: Kaomoji[] = [
  { text: '¯\\_(ツ)_/¯', name: 'Shrug', keywords: 'shrug whatever dunno idk' },
  { text: '(╯°□°)╯︵ ┻━┻', name: 'Table flip', keywords: 'angry rage flip table' },
  { text: '┬─┬ノ( º _ ºノ)', name: 'Table restore', keywords: 'calm fix put back table' },
  { text: '(ノ◕ヮ◕)ノ*:・゚✧', name: 'Sparkle throw', keywords: 'magic excited sparkle' },
  { text: '(⌐■_■)', name: 'Deal with it', keywords: 'cool sunglasses smug' },
  { text: '(╥﹏╥)', name: 'Crying', keywords: 'sad cry tears' },
  { text: 'ʕ•ᴥ•ʔ', name: 'Bear', keywords: 'bear cute animal' },
  { text: '(づ｡◕‿‿◕｡)づ', name: 'Hug', keywords: 'hug love cute' },
  { text: '(＾▽＾)', name: 'Happy', keywords: 'happy smile joy' },
  { text: '(•_•)', name: 'Blank stare', keywords: 'stare blank deadpan' },
  { text: '(ಥ﹏ಥ)', name: 'Sobbing', keywords: 'cry sad sob' },
  { text: 'ಠ_ಠ', name: 'Disapproval', keywords: 'look disapprove judging' },
  { text: '(◔_◔)', name: 'Eye roll', keywords: 'roll eyes annoyed' },
  { text: '＼(^o^)／', name: 'Cheering', keywords: 'yay celebrate happy' },
  { text: '(¬‿¬)', name: 'Smirk', keywords: 'sly smug knowing' },
  { text: '(๑•̀ㅂ•́)و✧', name: 'Determined', keywords: 'ready go determined fight' },
]

export function searchEmoji(query: string, group: EmojiGroup | 'All' = 'All'): Emoji[] {
  const q = query.trim().toLowerCase()
  const pool = group === 'All' ? EMOJI : EMOJI.filter((e) => e.group === group)
  if (!q) return pool
  // Name matches rank above keyword matches, and prefixes above substrings.
  const scored = pool
    .map((emoji) => {
      const name = emoji.name.toLowerCase()
      const keywords = emoji.keywords
      let score = 0
      if (name === q) score = 100
      else if (name.startsWith(q)) score = 80
      else if (name.includes(q)) score = 60
      else if (keywords.split(' ').some((k) => k === q)) score = 50
      else if (keywords.includes(q)) score = 30
      else if (emoji.char === q) score = 100
      return { emoji, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.map((s) => s.emoji)
}

export function searchKaomoji(query: string): Kaomoji[] {
  const q = query.trim().toLowerCase()
  if (!q) return KAOMOJI
  return KAOMOJI.filter((k) => k.name.toLowerCase().includes(q) || k.keywords.includes(q))
}
