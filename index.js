const { ReadableStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;

const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, 
    ChannelType, PermissionFlagsBits, ModalBuilder, 
    TextInputBuilder, TextInputStyle, Collection 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- الإعدادات المتقدمة ---
const CONFIG = {
    TOKEN: process.env.TOKEN,
    ADMIN_ROLE_ID: '1472225010134421676',
    LOG_CHANNEL_ID: '1473378884857630821',
    CATEGORY_ID: '1473378884857630820', // الفئة التي تفتح فيها التذاكر
    MAIN_IMAGE: 'https://cdn.discordapp.com/attachments/1473378884857630821/1477532261963403284/2C52B4D6-9301-46A4-8BC2-5D7127E89961.png',
    COLORS: { DEFAULT: 0x808080, SUCCESS: 0x00FF00, ERROR: 0xFF0000, BLUE: 0x0099FF }
};

client.once('ready', () => {
    console.log(`[SYSTEM] ${client.user.tag} Is Online! Strongest Ticket System Active.`);
});

// 1. أمر إنشاء قائمة التذاكر الرئيسية
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-ticket') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const mainEmbed = new EmbedBuilder()
            .setTitle('مركز الدعم الفني | Support Center')
            .setDescription('أهلاً بك في نظام التذاكر المتطور. يرجى اختيار القسم المناسب من القائمة أدناه.')
            .addFields(
                { name: '⚠️ تنبيه', value: 'يرجى عدم فتح تذكرة بدون سبب واضح، الصبر والهدوء يساعدنا على خدمتك بشكل أسرع.' }
            )
            .setColor(CONFIG.COLORS.DEFAULT)
            .setImage(CONFIG.IMAGE_OR_BANNER || CONFIG.MAIN_IMAGE)
            .setFooter({ text: 'VAULTA System', iconURL: client.user.displayAvatarURL() });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('main_ticket_menu')
                .setPlaceholder('إضغط هنا لاختيار القسم')
                .addOptions([
                    { label: 'قسم الشراء', description: 'لطلب المنتجات والخدمات', value: 'dept_buy', emoji: '🛒' },
                    { label: 'الدعم الفني', description: 'لحل المشاكل التقنية', value: 'dept_support', emoji: '🛠️' },
                    { label: 'الإدارة العليا', description: 'للمشاكل الخاصة والشكاوى', value: 'dept_admin', emoji: '👑' }
                ])
        );

        await message.channel.send({ embeds: [mainEmbed], components: [menu] });
    }
});

// 2. معالجة التفاعلات (Interaction Handling)
client.on('interactionCreate', async (interaction) => {
    
    // أ- فتح المودال عند الاختيار من القائمة
    if (interaction.isStringSelectMenu() && interaction.customId === 'main_ticket_menu') {
        const dept = interaction.values[0];
        let title = "معلومات إضافية";
        
        const modal = new ModalBuilder().setCustomId(`modal_${dept}`).setTitle(title);
        const input1 = new TextInputBuilder()
            .setCustomId('subject')
            .setLabel('موضوع التذكرة / المشكلة')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('مثلاً: مشكلة في الدفع')
            .setRequired(true);

        const input2 = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('التفاصيل')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('يرجى شرح التفاصيل هنا...')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input1), new ActionRowBuilder().addComponents(input2));
        await interaction.showModal(modal);
    }

    // ب- معالجة بيانات المودال وإنشاء الروم
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('modal_dept_')) {
            await interaction.deferReply({ ephemeral: true });

            const deptKey = interaction.customId.replace('modal_dept_', '');
            const subject = interaction.fields.getTextInputValue('subject');
            const description = interaction.fields.getTextInputValue('description');
            
            const deptNames = { buy: '🛒 شراء', support: '🛠️ دعم', admin: '👑 العليا' };
            const channelName = `${deptKey}-${interaction.user.username}`;

            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: CONFIG.CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: CONFIG.ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setAuthor({ name: `تذكرة جديدة: ${deptNames[deptKey] || 'عام'}`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(`أهلاً بك في القسم المختص. نتمنى منك الهدوء والصبر وعدم منشن الإدارة وسيتم الرد عليك في أسرع وقت 👋🏻`)
                .addFields(
                    { name: '👤 صاحب التذكرة', value: `${interaction.user}`, inline: true },
                    { name: '📝 الموضوع', value: subject, inline: true },
                    { name: '📄 التفاصيل المذكورة', value: `\`\`\`${description}\`\`\`` }
                )
                .setColor(CONFIG.COLORS.BLUE)
                .setTimestamp();

            const controlButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_claim').setLabel('استلام').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('btn_rename').setLabel('تغيير الاسم').setStyle(ButtonStyle.Primary).setEmoji('📝'),
                new ButtonBuilder().setCustomId('btn_close').setLabel('إغلاق').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ticketChannel.send({ 
                content: `${interaction.user} | <@&${CONFIG.ADMIN_ROLE_ID}>`, 
                embeds: [welcomeEmbed], 
                components: [controlButtons] 
            });

            await interaction.editReply({ content: `تم فتح تذكرتك بنجاح: ${ticketChannel}` });
        }

        // مودال تغيير الاسم
        if (interaction.customId === 'modal_rename') {
            const newName = interaction.fields.getTextInputValue('new_name_input');
            await interaction.channel.setName(newName);
            return interaction.reply({ content: `✅ تم تغيير اسم التذكرة إلى: **${newName}**` });
        }
    }

    // ج- أزرار التحكم داخل التذكرة
    if (interaction.isButton()) {
        const { customId, channel, user, member } = interaction;

        // التحقق من الرتبة الإدارية للأزرار الحساسة
        if (!member.roles.cache.has(CONFIG.ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '❌ هذا الزر مخصص للإدارة فقط!', ephemeral: true });
        }

        if (customId === 'btn_claim') {
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor(CONFIG.COLORS.SUCCESS).setDescription(`✅ تم استلام التذكرة بواسطة: ${user}`)] 
            });
            await channel.setName(`handled-${user.username}`);
        }

        if (customId === 'btn_rename') {
            const renameModal = new ModalBuilder().setCustomId('modal_rename').setTitle('تغيير اسم التذكرة');
            const nameInput = new TextInputBuilder()
                .setCustomId('new_name_input')
                .setLabel('الاسم الجديد للروم')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            renameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
            await interaction.showModal(renameModal);
        }

        if (customId === 'btn_close') {
            await interaction.reply('🔒 سيتم إغلاق التذكرة وأرشفة البيانات خلال 5 ثوانٍ...');
            
            // نظام اللوج (Log System)
            const logChannel = client.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
            if (logChannel) {
                logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('تقرير إغلاق تذكرة')
                            .addFields(
                                { name: 'التذكرة', value: channel.name, inline: true },
                                { name: 'بواسطة', value: user.tag, inline: true }
                            )
                            .setColor(CONFIG.COLORS.ERROR)
                            .setTimestamp()
                    ]
                });
            }
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(process.env.TOKEN);
