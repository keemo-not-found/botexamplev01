//Simple Discord Server Verification Bot.
//Simple Customization. for more params, read EmbedBuilder docs.
//Hardcoded TOKEN, clientid, guildid could be changed within 2 lines of code *(Better to use dotenv and store sensitive data in here)
//keemowastaken discord (if you need some help with discord api and discord.js docs)


const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

const token = 'YOUR_TOKEN_HERE'; // Better to install dotenv and store sensitive data in .env file
const clientId = 'YOUR_APPLICATION_ID_HERE';
const guildId = 'YOUR_GUILD_ID_HERE'; // Optional: For testing in a specific server

// Database to store verification data (in a real bot, use a proper database)
const verificationData = {
  verifiedUsers: new Set(),
  verificationChannel: null,
  verifiedRole: null
};

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Настройка верификации')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Канал в который отправить верификационное сообщение')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Верифицированная роль')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('статистика')
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
    }

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'setup') {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: 'Съебался лох!', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    
    verificationData.verificationChannel = channel.id;
    verificationData.verifiedRole = role.id;

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Привет!')
      .setDescription('Чтобы получить доступ к серверу и оформить микрозайм, нажми на кнопку ниже!');

    const button = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verify_button')
          .setLabel('ку')
          .setStyle(ButtonStyle.Primary),
      );

    try {
      await channel.send({ embeds: [embed], components: [button] });
      await interaction.reply({ 
        content: `Установка завершена!\n- channel: ${channel}\n- role: ${role}`, 
        ephemeral: true 
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Ошибка!', ephemeral: true });
    }
  }

  if (interaction.commandName === 'info') {
    const verifiedCount = verificationData.verifiedUsers.size;
    const memberCount = interaction.guild.memberCount;
    const verifiedRole = verificationData.verifiedRole ? 
      interaction.guild.roles.cache.get(verificationData.verifiedRole)?.name || 'Not set' : 
      'Not set';

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('Статистика')
      .addFields(
        { name: 'Верифицированные людишки', value: verifiedCount.toString(), inline: true },
        { name: 'Всего людей', value: memberCount.toString(), inline: true },
        { name: 'Роль', value: verifiedRole, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'verify_button') {
    if (verificationData.verifiedUsers.has(interaction.user.id)) {
      await interaction.reply({ content: 'Здарова, заебал!', ephemeral: true });
      return;
    }

    if (!verificationData.verifiedRole) {
      await interaction.reply({ content: 'Ошибка!', ephemeral: true });
      return;
    }

    try {
      // Add the verified role to the user
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.add(verificationData.verifiedRole);
      
      verificationData.verifiedUsers.add(interaction.user.id);
      
      await interaction.reply({ 
        content: 'Верификация пройдена, добро пожаловать на сервер Otaku!', 
        ephemeral: true 
      });
    } catch (error) {
      console.error('Error during verification:', error);
      await interaction.reply({ 
        content: 'Чето пошло не так, напиши админу.', 
        ephemeral: true 
      });
    }
  }
});

client.login(token);