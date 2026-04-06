const { ReadableStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// إعدادات الرتب والقنوات
const NORMAL_SUPPORT_ROLE = '1459353728233636022'; 
const HIGH_SUPPORT_ROLE = '1488903490381152450'; 
const EVENT_SUPPORT_ROLE = '1465362786467971357'; 
const LOG_CHANNEL_ID = '1488858730924605491'; 
const MAIN_IMAGE = 'https://cdn.discordapp.com/attachments/1488857849349017802/1489642814357639418/background.png';
const RIGHTS_TEXT = 'اهلاً بك في ساحة ريسكبت';

client.once('ready', () => console.log(`${client.user.tag} جاهز!`));

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
                    { label: 'Staff Support', value: 'staff_support' },
                    { label: 'High Support', value: 'high_support' },
                    { label: 'Event Support', value: 'event_support' },
                    { label: 'Rest Menu', value: 'rest_menu' }
                ])
        );
        await message.channel.send({ embeds: [embed], components: [menu] });
    }
});

client.on('interactionCreate', async (interaction) => {
    
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const choice = interaction.values[0];

        if (choice === 'rest_menu') {
            return interaction.reply({ content: 'تم إعادة تهيئة القائمة بنجاح ✅', ephemeral: true });
        }

        let modalTitle = '';
        if (choice === 'staff_support') modalTitle = 'الدعم الفني';
        if (choice === 'high_support') modalTitle = 'دعم العليا';
        if (choice === 'event_support') modalTitle = 'دعم الايفنت';

        const modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle(modalTitle);
        const issue = new TextInputBuilder()
            .setCustomId('issue_text').setLabel('اشرح مشكلتك').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(issue));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'rename_modal') {
            const newName = interaction.fields.getTextInputValue('new_name');
            await interaction.channel.setName(newName);
            return interaction.reply({ content: `تم تغيير اسم التذكرة إلى: **${newName}**`, ephemeral: true });
        }

        const type = interaction.customId.split('_')[1];
        let targetRole, sectionName, welcomeName;

        if (type === 'staff_support') {
            targetRole = NORMAL_SUPPORT_ROLE;
            sectionName = 'الدعم الفني';
            welcomeName = 'الدعم الفني';
        } else if (type === 'high_support') {
            targetRole = HIGH_SUPPORT_ROLE;
            sectionName = 'دعم العليا';
            welcomeName = 'دعم العليا';
        } else if (type === 'event_support') {
            targetRole = EVENT_SUPPORT_ROLE;
            sectionName = 'دعم الايفنت';
            welcomeName = 'دعم الايفنت';
        }

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: targetRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        const welcomeEmbed = new EmbedBuilder()
            .setDescription(`اهلا بك في **${welcomeName}** نتمنى منك الهدوء والصبر وعدم منشن الاداره وسيتم حل مشكلتك في اسرع وقت 👋🏻`)
            .addFields(
                { name: 'نوع القسم :', value: `\`${sectionName}\``, inline: false },
                { name: 'يوزر الشخص :', value: `${interaction.user}`, inline: false },
                { name: 'المشكله او الاستفسار :', value: `\`\`\`${interaction.fields.getTextInputValue('issue_text')}\`\`\``, inline: false }
            )
            .setColor(0x2b2d31)
            .setFooter({ text: RIGHTS_TEXT });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكرة').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('rename_ticket').setLabel('تغيير اسم التذكرة').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('delete_ticket').setLabel('إغلاق وحفظ').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@${interaction.user.id}> | <@&${targetRole}>`, embeds: [welcomeEmbed], components: [buttons] });
        await interaction.reply({ content: `تم فتح تذكرتك: ${channel}`, ephemeral: true });
    }

    if (interaction.isButton()) {
        const hasPerms = interaction.member.roles.cache.has(HIGH_SUPPORT_ROLE) || 
                         interaction.member.roles.cache.has(NORMAL_SUPPORT_ROLE) || 
                         interaction.member.roles.cache.has(EVENT_SUPPORT_ROLE);

        if (!hasPerms) return interaction.reply({ content: 'للإدارة فقط.', ephemeral: true });

        if (interaction.customId === 'claim_ticket') {
            const claimEmbed = new EmbedBuilder().setDescription(`✅ تم استلام التدكرة بواسطة : <@${interaction.user.id}>`).setColor(0x43b581);
            const oldRows = interaction.message.components[0].components.map(btn => {
                const b = ButtonBuilder.from(btn);
                if (btn.customId === 'claim_ticket') b.setDisabled(true).setLabel('تم الاستلام');
                return b;
            });
            await interaction.update({ components: [new ActionRowBuilder().addComponents(oldRows)] });
            await interaction.followUp({ embeds: [claimEmbed] });
        }

        if (interaction.customId === 'rename_ticket') {
            const modal = new ModalBuilder().setCustomId('rename_modal').setTitle('تغيير اسم التذكرة');
            const input = new TextInputBuilder()
                .setCustomId('new_name').setLabel('اختر الاسم الجديد للتذكرة :').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'delete_ticket') {
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const log = new EmbedBuilder().setTitle('سجل الإغلاق').setDescription(`أغلق ${interaction.user} تذكرة \`${interaction.channel.name}\``).setColor(0xff0000);
                await logChannel.send({ embeds: [log] }).catch(() => {});
            }
            await interaction.reply('جاري الحذف...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }
    }
});

client.login(process.env.TOKEN);
