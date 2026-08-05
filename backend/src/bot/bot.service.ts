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

    // The 2-column custom reply keyboard shown at the bottom of the chat.
    const mainKeyboard = Markup.keyboard([
      ['Play 🎮', 'Register 📝'],
      ['Check Balance 💰', 'Deposit 💵'],
      ['Contact Support 🎧', 'Instruction 📖'],
      ['Transfer 🎁', 'Withdraw 🤑'],
      ['Invite 🔗', 'Convert Bonus 💱'],
    ]).resize();

    this.bot.start((ctx) => {
      ctx.reply('👋 Welcome to Hi-Lo! Choose an option below.', mainKeyboard);
    });

    // Slash-command menu (appears when tapping the Menu button / typing "/").
    this.bot.telegram.setMyCommands([
      { command: 'play', description: 'Play Game' },
      { command: 'deposit', description: 'Deposit' },
      { command: 'withdraw', description: 'Withdraw' },
      { command: 'transfer', description: 'Transfer' },
      { command: 'invite', description: 'Invite' },
      { command: 'convert_bonus', description: 'Convert Bonus' },
      { command: 'instruction', description: 'Instruction' },
      { command: 'support', description: 'Contact Support' },
      { command: 'register', description: 'Register' },
      { command: 'balance', description: 'Check Balance' },
      { command: 'start', description: 'Start the bot' },
    ]);

    // Placeholder handlers — appearance only, no real logic yet.
    this.bot.hears('Play 🎮', (ctx) => ctx.reply('🎮 Play — coming soon.'));
    this.bot.hears('Register 📝', (ctx) => ctx.reply('📝 Register — coming soon.'));
    this.bot.hears('Check Balance 💰', (ctx) => ctx.reply('💰 Check Balance — coming soon.'));
    this.bot.hears('Deposit 💵', (ctx) => ctx.reply('💵 Deposit — coming soon.'));
    this.bot.hears('Contact Support 🎧', (ctx) => ctx.reply('🎧 Contact Support — coming soon.'));
    this.bot.hears('Instruction 📖', (ctx) => ctx.reply('📖 Instruction — coming soon.'));
    this.bot.hears('Transfer 🎁', (ctx) => ctx.reply('🎁 Transfer — coming soon.'));
    this.bot.hears('Withdraw 🤑', (ctx) => ctx.reply('🤑 Withdraw — coming soon.'));
    this.bot.hears('Invite 🔗', (ctx) => ctx.reply('🔗 Invite — coming soon.'));
    this.bot.hears('Convert Bonus 💱', (ctx) => ctx.reply('💱 Convert Bonus — coming soon.'));

    this.bot.command('play', (ctx) => ctx.reply('🎮 Play — coming soon.'));
    this.bot.command('register', (ctx) => ctx.reply('📝 Register — coming soon.'));
    this.bot.command('balance', (ctx) => ctx.reply('💰 Check Balance — coming soon.'));
    this.bot.command('deposit', (ctx) => ctx.reply('💵 Deposit — coming soon.'));
    this.bot.command('withdraw', (ctx) => ctx.reply('🤑 Withdraw — coming soon.'));
    this.bot.command('transfer', (ctx) => ctx.reply('🎁 Transfer — coming soon.'));
    this.bot.command('invite', (ctx) => ctx.reply('🔗 Invite — coming soon.'));
    this.bot.command('convert_bonus', (ctx) => ctx.reply('💱 Convert Bonus — coming soon.'));
    this.bot.command('instruction', (ctx) => ctx.reply('📖 Instruction — coming soon.'));
    this.bot.command('support', (ctx) => ctx.reply('🎧 Contact Support — coming soon.'));

    this.bot.launch();
    this.logger.log('Telegram bot server started (polling mode)');
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }
}