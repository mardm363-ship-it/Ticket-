const { ReadableStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// الإعدادات
const HIGH_SUPPORT_ROLE = '1488903490381152450'; 
const NORMAL_SUPPORT_ROLE = '1459353728233636022'; 
const LOG_CHANNEL_ID = '1488858730924605491'; 
const MAIN_IMAGE = 'https://cdn.discordapp.com/attachments/1488857849349017802/1489642814357639418/background.png';
const RIGHTS_TEXT = 'جميع الحقوق محفوظة لـ ساحة ريسكبت';

client.once('ready', () => console.log(`${client.user.tag} جاهز لخدمة ساحة ريسكبت!`));

client.on('messageCreate', async (message) => {
    if (message.content === '!تكت') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const embed = new EmbedBuilder()
            .setTitle('مركز الدعم الفني | ساحة ريسكبت')
            .setDescription('يرجى اختيار القسم المناسب لفتح تذكرة وسيتم الرد عليك فوراً.')
            .setColor(0x2b2d31)
            .setImage(MAIN_IMAGE)
            .setFooter({ text: RIGHTS_TEXT });
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('إضغط هنا لفتح تذكرة')
                .addOptions([
                    { label: 'دعم العليا', value: 'high_support' },
                    { label: 'الدعم الفني', value: 'normal_support' }
                ])
        );
        await message.channel.send({ embeds: [embed], components: [menu] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const choice = interaction.values[0];
        const modal = new ModalBuilder()
            .setCustomId(`modal_${choice}`)
            .setTitle(choice === 'high_support' ? 'دعم العليا' : 'الدعم الفني');
        const issue = new TextInputBuilder()
            .setCustomId('issue_text')
            .setLabel('اكتب المشكله')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('يرجى كتابة تفاصيل المشكلة هنا...')
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(issue));
        await interaction.showModal(modal);
    }
    if (interaction.isModalSubmit()) {
        const type = interaction.customId.split('_')[1];
        const isHigh = type === 'high_support';
        const targetRole = isHigh ? HIGH_SUPPORT_ROLE : NORMAL_SUPPORT_ROLE;
        const channelName = `ticket-${interaction.user.username}`;
        try {
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: targetRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });
            const welcomeEmbed = new EmbedBuilder()
                .setDescription(`اهلا بك في **${isHigh ? 'دعم العليا' : 'الدعم الفني'}** نتمنى منك الهدوء والصبر وعدم منشن الاداره وسيتم حل مشكلتك في اسرع وقت 👋🏻`)
                .addFields(
                    { name: 'نوع القسم :', value: `\`${isHigh ? 'دعم العليا' : 'الدعم الفني'}\``, inline: false },
                    { name: 'يوزر الشخص :', value: `${interaction.user}`, inline: false },
                    { name: 'المشكله او الاستفسار :', value: `\`\`\`${interaction.fields.getTextInputValue('issue_text')}\`\`\``, inline: false }
                )
                .setColor(0x2b2d31)
                .setFooter({ text: RIGHTS_TEXT });
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكرة').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('إغلاق وحفظ').setStyle(ButtonStyle.Danger)
            );
            await channel.send({ content: `<@${interaction.user.id}> | <@&${targetRole}>`, embeds: [welcomeEmbed], components: [buttons] });
            await interaction.reply({ content: `تم فتح تذكرتك: ${channel}`, ephemeral: true });
        } catch (err) {
            console.error(err);
        }
    }
    if (interaction.isButton()) {
        if (!interaction.member.roles.cache.has(HIGH_SUPPORT_ROLE) && !interaction.member.roles.cache.has(NORMAL_SUPPORT_ROLE)) {
            return interaction.reply({ content: 'عذراً، هذا الإجراء للمسؤولين فقط.', ephemeral: true });
        }
        if (interaction.customId === 'claim_ticket') {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claimed').setLabel('تم استلام التذكرة').setStyle(ButtonStyle.Success).setDisabled(true),
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('إغلاق وحفظ').setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ components: [disabledRow] });
            await interaction.followUp({ content: `تم استلام التذكرة بواسطة <@${interaction.user.id}>` });
        }
        if (interaction.customId === 'delete_ticket') {
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('سجل إغلاق تذكرة')
                    .setDescription(`تم إغلاق تذكرة \`${interaction.channel.name}\` بواسطة ${interaction.user}`)
                    .setColor(0xff0000)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
            await interaction.reply('سيتم الحذف...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }
    }
});

client.login(process.env.TOKEN);
