require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// إعداداتك
const STAFF_ROLE = '1459353728233636022'; 
const HIGH_ROLE = '1488903490381152450'; 
const EVENT_ROLE = '1465362786467971357'; 
const LOG_CHANNEL_ID = '1488858730924605491'; 

const MAIN_IMAGE = 'https://cdn.discordapp.com/attachments/1488857849349017802/1489642814357639418/background.png';
const RIGHTS_TEXT = 'نظام سجلات ساحة ريسكبت التاريخي';

// ذاكرة مؤقتة لحفظ البيانات
const ticketData = new Map();

client.once('ready', () => console.log(`✅ ${client.user.tag} يعمل بنظام اللوج السريع (بدون ملفات)`));

async function sendLog(embed, components = []) {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
        await logChannel.send({ embeds: [embed], components: components }).catch(e => console.log("خطأ في اللوج:", e));
    }
}

client.on('messageCreate', async (message) => {
    if (message.content === '!تكت') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const embed = new EmbedBuilder()
            .setTitle('مركز الدعم الفني | ساحة ريسكبت')
            .setDescription('يرجى اختيار القسم المناسب لفتح تذكرة وسيتم الرد عليك فوراً.')
            .setColor(0x2b2d31)
            .setImage(MAIN_IMAGE)
            .setFooter({ text: 'ساحة ريسكبت' });
        
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('إضغط هنا لفتح تذكرة')
                .addOptions([
                    { label: 'Staff Support', value: 'staff' },
                    { label: 'High Support', value: 'high' },
                    { label: 'Event Support', value: 'event' }
                ])
        );
        await message.channel.send({ embeds: [embed], components: [menu] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const choice = interaction.values[0];
        const titles = { staff: 'الدعم الفني', high: 'دعم العليا', event: 'دعم الايفنت' };
        const modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle(titles[choice]);
        const issue = new TextInputBuilder()
            .setCustomId('issue_text').setLabel('اشرح مشكلتك').setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(issue));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'rename_modal') {
            await interaction.channel.setName(interaction.fields.getTextInputValue('new_name'));
            return interaction.reply({ content: `تم تغيير الاسم بنجاح ✅`, ephemeral: true });
        }

        const type = interaction.customId.replace('modal_', '');
        let targetRole, sectionName;
        if (type === 'staff') { targetRole = STAFF_ROLE; sectionName = 'الدعم الفني'; }
        else if (type === 'high') { targetRole = HIGH_ROLE; sectionName = 'دعم العليا'; }
        else if (type === 'event') { targetRole = EVENT_ROLE; sectionName = 'دعم الايفنت'; }

        try {
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: targetRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                ],
            });

            ticketData.set(channel.id, {
                openerID: interaction.user.id,
                section: sectionName,
                claimedID: 'لم تستلم',
                openTime: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' }),
                problem: interaction.fields.getTextInputValue('issue_text')
            });

            const welcomeEmbed = new EmbedBuilder()
                .setDescription(`اهلا بك في **${sectionName}** نتمنى منك الهدوء والصبر وعدم منشن الاداره وسيتم حل مشكلتك في اسرع وقت 👋🏻`)
                .addFields(
                    { name: 'نوع القسم :', value: `\`${sectionName}\`` },
                    { name: 'يوزر الشخص :', value: `${interaction.user}` },
                    { name: 'المشكله :', value: `\`\`\`${interaction.fields.getTextInputValue('issue_text')}\`\`\`` }
                ).setColor(0x2b2d31).setFooter({ text: 'ساحة ريسكبت' });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكره').setEmoji('1490731444274725086').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('rename_ticket_btn').setLabel('تعديل الاسم').setEmoji('1490731519428526343').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('close_request').setLabel('إغلاق التذكره').setEmoji('1490731480731615507').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@${interaction.user.id}> | <@&${targetRole}>`, embeds: [welcomeEmbed], components: [buttons] });
            await interaction.reply({ content: `تم فتح تذكرتك: ${channel}`, ephemeral: true });
        } catch (e) { console.log(e); }
    }

    if (interaction.isButton()) {
        const hasPerms = interaction.member.roles.cache.has(HIGH_ROLE) || interaction.member.roles.cache.has(STAFF_ROLE) || interaction.member.roles.cache.has(EVENT_ROLE);

        if (interaction.customId.startsWith('log_info_')) {
            if (!hasPerms) return interaction.reply({ content: 'للإدارة فقط.', ephemeral: true });
            const tID = interaction.customId.replace('log_info_', '');
            const data = ticketData.get(tID);
            if (!data) return interaction.reply({ content: 'عذراً، البيانات ممسوحة من الذاكرة.', ephemeral: true });

            const infoEmbed = new EmbedBuilder()
                .setTitle('📋 تفاصيل التذكرة')
                .setColor(0x5865f2)
                .addFields(
                    { name: '👤 صاحب التذكرة:', value: `<@${data.openerID}>`, inline: true },
                    { name: '🛠️ المستلم:', value: data.claimedID !== 'لم تستلم' ? `<@${data.claimedID}>` : 'لم تستلم', inline: true },
                    { name: '📂 القسم:', value: `\`${data.section}\``, inline: true },
                    { name: '⏰ وقت الفتح:', value: `\`${data.openTime}\``, inline: true },
                    { name: '📝 المشكلة الأصلية:', value: `\`\`\`${data.problem}\`\`\`` }
                );
            return interaction.reply({ embeds: [infoEmbed], ephemeral: true });
        }

        if (!hasPerms) return interaction.reply({ content: 'للإدارة فقط.', ephemeral: true });

        if (interaction.customId === 'claim_ticket') {
            const data = ticketData.get(interaction.channel.id);
            if (data) data.claimedID = interaction.user.id;
            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[0].setDisabled(true).setLabel('تم الاستلام');
            await interaction.update({ components: [row] });
            await interaction.followUp({ content: `✅ تم استلام التذكرة بواسطة <@${interaction.user.id}>` });
        }

        if (interaction.customId === 'rename_ticket_btn') {
            const modal = new ModalBuilder().setCustomId('rename_modal').setTitle('تعديل اسم التذكرة');
            const input = new TextInputBuilder().setCustomId('new_name').setLabel('الاسم الجديد:').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'close_request') {
            const confirmEmbed = new EmbedBuilder().setDescription('**هل أنت متأكد من إغلاق هذه التذكرة؟**').setColor(0xf1c40f);
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('تاكيد إغلاق التذكرة').setEmoji('1490731480731615507').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('فتح التذكرة').setEmoji('1490732764935360532').setStyle(ButtonStyle.Success)
            );
            await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow] });
        }

        if (interaction.customId === 'confirm_close') {
            await interaction.update({ content: 'جاري الحذف وإرسال السجل...', embeds: [], components: [] });
            const data = ticketData.get(interaction.channel.id);

            const closeLog = new EmbedBuilder()
                .setTitle('🔒 تذكرة مغلقة')
                .setDescription(`أغلق <@${interaction.user.id}> تذكرة \`${interaction.channel.name}\``)
                .setColor(0xe74c3c).setTimestamp().setFooter({ text: RIGHTS_TEXT });

            const logRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`log_info_${interaction.channel.id}`).setEmoji('1490729497467555910').setStyle(ButtonStyle.Secondary)
            );

            await sendLog(closeLog, [logRow]);
            setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
        }

        if (interaction.customId === 'cancel_close') {
            await interaction.message.delete().catch(() => {});
        }
    }
});

client.login(process.env.TOKEN);
