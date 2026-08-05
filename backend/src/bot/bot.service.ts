import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot!: Telegraf;

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot server will not start');
      return;
    }

    this.bot = new Telegraf(token);

    const mainMenu = Markup.inlineKeyboard([
      [Markup.button.callback('Play 🎮', 'play'), Markup.button.callback('Register 📝', 'register')],
      [Markup.button.callback('Check Balance 💰', 'balance'), Markup.button.callback('Deposit 💵', 'deposit')],
      [Markup.button.callback('Contact Support 🎧', 'support'), Markup.button.callback('Instruction 📖', 'instruction')],
      [Markup.button.callback('Transfer 🎁', 'transfer'), Markup.button.callback('Withdraw 🤑', 'withdraw')],
      [Markup.button.callback('Invite 🔗', 'invite'), Markup.button.callback('Convert Bonus 💱', 'convert_bonus')],
    ]);

   this.bot.start((ctx) => {
  ctx.replyWithPhoto(
    'https://hi-lo-kappa.vercel.app/logo.png',
    {
      caption: '👋 Welcome to Hi-Lo! Choose an option below.',
      ...mainMenu,
    }
  );
});
    const placeholderReply = (label: string) => async (ctx: any) => {
      await ctx.answerCbQuery();
      await ctx.reply(`${label} — coming soon.`);
    };

    // --- Custom, real descriptions ---

    const playReply = async (ctx: any) => {
      await ctx.answerCbQuery?.();
      await ctx.reply('🎮 Tap below to launch Hi-Lo and start playing!');
      // Later: attach a Mini App launch button here instead of plain text.
    };

    const instructionReply = async (ctx: any) => {
      await ctx.answerCbQuery?.();
      await ctx.reply(
        '📖 How to play Hi-Lo:\n\n' +
          '1️⃣ Place your bet\n' +
          '2️⃣ Guess if the next card is Higher or Lower\n' +
          '3️⃣ Keep guessing right to build your streak and multiplier\n' +
          '4️⃣ Cash out anytime to lock in your winnings — or push your luck for more!'
      );
    };

    const supportReply = async (ctx: any) => {
      await ctx.answerCbQuery?.();
      await ctx.reply('🎧 Need help? Reach out to our support team and we\'ll get back to you as soon as possible.');
      // Replace with your real handle/email, e.g.: '@your_support_handle' or 'support@yourdomain.com'
    };

    const inviteReply = async (ctx: any) => {
      await ctx.answerCbQuery?.();
      const refLink = `https://t.me/@HILOBETTING_BOT?start=ref_${ctx.from?.id ?? ''}`;
      await ctx.reply(`🔗 Invite friends and earn bonuses!\n\nShare your link:\n${refLink}`);
      // Replace 'YourBotUsername' with your bot's actual @username.
    };

    // --- Inline button handlers ---

    this.bot.action('play', playReply);
    this.bot.action('register', placeholderReply('📝 Register'));
    this.bot.action('balance', placeholderReply('💰 Check Balance'));
    this.bot.action('deposit', placeholderReply('💵 Deposit'));
    this.bot.action('support', supportReply);
    this.bot.action('instruction', instructionReply);
    this.bot.action('transfer', placeholderReply('🎁 Transfer'));
    this.bot.action('withdraw', placeholderReply('🤑 Withdraw'));
    this.bot.action('invite', inviteReply);
    this.bot.action('convert_bonus', placeholderReply('💱 Convert Bonus'));

    // --- Slash command handlers (mirrors the buttons above) ---

    this.bot.command('play', playReply);
    this.bot.command('register', placeholderReply('📝 Register'));
    this.bot.command('balance', placeholderReply('💰 Check Balance'));
    this.bot.command('deposit', placeholderReply('💵 Deposit'));
    this.bot.command('withdraw', placeholderReply('🤑 Withdraw'));
    this.bot.command('transfer', placeholderReply('🎁 Transfer'));
    this.bot.command('invite', inviteReply);
    this.bot.command('convert_bonus', placeholderReply('💱 Convert Bonus'));
    this.bot.command('instruction', instructionReply);
    this.bot.command('support', supportReply);

    this.bot.launch();
    this.logger.log('Telegram bot server started (polling mode)');
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }
}