const { ReadableStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
// المكتبة المسؤولة عن صنع ملف المحادثة التاريخي
const discordTranscripts = require('discord-html-transcripts');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// إعدادات الرتب واللوق (نفس بياناتك)
const STAFF_ROLE = '1459353728233636022'; 
const HIGH_ROLE = '1488903490381152450'; 
const EVENT_ROLE = '1465362786467971357'; 
const LOG_CHANNEL_ID = '1488858730924605491'; 

const MAIN_IMAGE = 'https://cdn.discordapp.com/attachments/1488857849349017802/1489642814357639418/background.png';
const RIGHTS_TEXT = 'نظام سجلات ساحة ريسكبت التاريخي';

client.once('ready', () => console.log(`${client.user.tag} جاهز ونظام اللوج التاريخي يعمل!`));

// دالة اللوج الاحترافي
async function sendLog(embed, file = null) {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
        const payload = { embeds: [embed] };
        if (file) payload.files = [file];
        await logChannel.send(payload).catch(console.error);
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
                    { label: 'Event Support', value: 'event' },
                    { label: 'Rest Menu', value: 'rest' }
                ])
        );
        await message.channel.send({ embeds: [embed], components: [menu] });
    }
});

client.on('interactionCreate', async (interaction) => {
    
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const choice = interaction.values[0];
        if (choice === 'rest') {
            return interaction.update({ components: [interaction.message.components[0]] }).catch(() => {});
        }

        const titles = { staff: 'الدعم الفني', high: 'دعم العليا', event: 'دعم الايفنت' };
        const modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle(titles[choice]);
        const issue = new TextInputBuilder()
            .setCustomId('issue_text').setLabel('اشرح مشكلتك').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(issue));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'rename_modal') {
            const oldName = interaction.channel.name;
            const newName = interaction.fields.getTextInputValue('new_name');
            await interaction.channel.setName(newName);
            
            const log = new EmbedBuilder()
                .setTitle('📝 تغيير اسم التذكرة')
                .addFields(
                    { name: 'بواسطة:', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                    { name: 'من:', value: `\`${oldName}\``, inline: true },
                    { name: 'إلى:', value: `\`${newName}\``, inline: true }
                )
                .setColor(0x3498db)
                .setTimestamp();
            await sendLog(log);

            return interaction.reply({ content: `تم تغيير الاسم إلى: **${newName}**`, ephemeral: true });
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

            const openLog = new EmbedBuilder()
                .setTitle('🆕 تذكرة جديدة')
                .addFields(
                    { name: 'صاحب التذكرة:', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                    { name: 'القسم:', value: `\`${sectionName}\``, inline: true },
                    { name: 'القناة:', value: `${channel}`, inline: true },
                    { name: 'المشكلة المقدمة:', value: `\`\`\`${interaction.fields.getTextInputValue('issue_text')}\`\`\`` }
                )
                .setColor(0x2ecc71)
                .setTimestamp();
            await sendLog(openLog);

            const welcomeEmbed = new EmbedBuilder()
                .setDescription(`اهلا بك في **${sectionName}** نتمنى منك الهدوء والصبر وعدم منشن الاداره وسيتم حل مشكلتك في اسرع وقت 👋🏻`)
                .addFields(
                    { name: 'نوع القسم :', value: `\`${sectionName}\``, inline: false },
                    { name: 'يوزر الشخص :', value: `${interaction.user}`, inline: false },
                    { name: 'المشكله او الاستفسار :', value: `\`\`\`${interaction.fields.getTextInputValue('issue_text')}\`\`\``, inline: false }
                )
                .setColor(0x2b2d31)
                .setFooter({ text: 'ساحة ريسكبت' });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكرة').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('rename_ticket_btn').setLabel('تغيير اسم التذكرة').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('إغلاق وحفظ').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@${interaction.user.id}> | <@&${targetRole}>`, embeds: [welcomeEmbed], components: [buttons] });
            await interaction.reply({ content: `تم فتح تذكرتك: ${channel}`, ephemeral: true });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'فشل فتح التذكرة، تأكد من الصلاحيات.', ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        const hasPerms = interaction.member.roles.cache.has(HIGH_ROLE) || 
                         interaction.member.roles.cache.has(STAFF_ROLE) || 
                         interaction.member.roles.cache.has(EVENT_ROLE);

        if (!hasPerms) return interaction.reply({ content: 'للإدارة فقط.', ephemeral: true });

        if (interaction.customId === 'claim_ticket') {
            const claimLog = new EmbedBuilder()
                .setTitle('📩 استلام تذكرة')
                .addFields(
                    { name: 'الإداري المستلم:', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                    { name: 'القناة:', value: `\`${interaction.channel.name}\``, inline: true }
                )
                .setColor(0xf1c40f)
                .setTimestamp();
            await sendLog(claimLog);

            const components = interaction.message.components[0].components.map(button => {
                const updated = ButtonBuilder.from(button);
                if (button.customId === 'claim_ticket') updated.setDisabled(true).setLabel('تم الاستلام');
                return updated;
            });

            await interaction.update({ components: [new ActionRowBuilder().addComponents(components)] });
            await interaction.followUp({ embeds: [new EmbedBuilder().setDescription(`✅ تم استلام التدكرة بواسطة : <@${interaction.user.id}>`).setColor(0x43b581)] });
        }

        if (interaction.customId === 'rename_ticket_btn') {
            const modal = new ModalBuilder().setCustomId('rename_modal').setTitle('تغيير اسم التذكرة');
            const input = new TextInputBuilder()
                .setCustomId('new_name').setLabel('اختر الاسم الجديد :').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'delete_ticket') {
            await interaction.reply('جاري حفظ المحادثة وإغلاق التذكرة...');

            // إنشاء ملف الـ Transcript التاريخي لمحتوى التذكرة
            const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                limit: -1, // جلب كل الرسائل بدون استثناء
                fileName: `transcript-${interaction.channel.name}.html`,
                returnType: 'attachment',
                saveImages: true,
                poweredBy: false
            });

            const closeLog = new EmbedBuilder()
                .setTitle('🔒 إغلاق وحذف تذكرة (سجل كامل)')
                .addFields(
                    { name: 'أغلقها:', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                    { name: 'اسم التذكرة المحذوفة:', value: `\`${interaction.channel.name}\``, inline: true }
                )
                .setDescription('تم إرفاق ملف التاريخ (Transcript) أدناه لمراجعة المحادثة بالكامل.')
                .setColor(0xe74c3c)
                .setTimestamp()
                .setFooter({ text: RIGHTS_TEXT });

            await sendLog(closeLog, attachment);

            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }
    }
});

client.login(process.env.TOKEN);
