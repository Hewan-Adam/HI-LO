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

    // Inline keyboard — buttons attached to the message itself, not the
    // bottom keyboard bar.
    const mainMenu = Markup.inlineKeyboard([
      [Markup.button.callback('Play 🎮', 'play'), Markup.button.callback('Register 📝', 'register')],
      [Markup.button.callback('Check Balance 💰', 'balance'), Markup.button.callback('Deposit 💵', 'deposit')],
      [Markup.button.callback('Contact Support 🎧', 'support'), Markup.button.callback('Instruction 📖', 'instruction')],
      [Markup.button.callback('Transfer 🎁', 'transfer'), Markup.button.callback('Withdraw 🤑', 'withdraw')],
      [Markup.button.callback('Invite 🔗', 'invite'), Markup.button.callback('Convert Bonus 💱', 'convert_bonus')],
    ]);

    this.bot.start((ctx) => {
      ctx.reply('👋 Welcome to Hi-Lo! Choose an option below.', mainMenu);
    });

    // Each callback_data value above triggers this handler.
    const placeholderReply = (label: string) => async (ctx: any) => {
      await ctx.answerCbQuery(); // stops the button's loading spinner
      await ctx.reply(`${label} — coming soon.`);
    };

    this.bot.action('play', placeholderReply('🎮 Play'));
    this.bot.action('register', placeholderReply('📝 Register'));
    this.bot.action('balance', placeholderReply('💰 Check Balance'));
    this.bot.action('deposit', placeholderReply('💵 Deposit'));
    this.bot.action('support', placeholderReply('🎧 Contact Support'));
    this.bot.action('instruction', placeholderReply('📖 Instruction'));
    this.bot.action('transfer', placeholderReply('🎁 Transfer'));
    this.bot.action('withdraw', placeholderReply('🤑 Withdraw'));
    this.bot.action('invite', placeholderReply('🔗 Invite'));
    this.bot.action('convert_bonus', placeholderReply('💱 Convert Bonus'));

    // Slash commands still work the same way as text commands, separate
    // from the inline buttons above.
    this.bot.command('play', placeholderReply('🎮 Play'));
    this.bot.command('register', placeholderReply('📝 Register'));
    this.bot.command('balance', placeholderReply('💰 Check Balance'));
    this.bot.command('deposit', placeholderReply('💵 Deposit'));
    this.bot.command('withdraw', placeholderReply('🤑 Withdraw'));
    this.bot.command('transfer', placeholderReply('🎁 Transfer'));
    this.bot.command('invite', placeholderReply('🔗 Invite'));
    this.bot.command('convert_bonus', placeholderReply('💱 Convert Bonus'));
    this.bot.command('instruction', placeholderReply('📖 Instruction'));
    this.bot.command('support', placeholderReply('🎧 Contact Support'));

    this.bot.launch();
    this.logger.log('Telegram bot server started (polling mode)');
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }
}