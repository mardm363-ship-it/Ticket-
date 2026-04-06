const { ReadableStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// إعدادات الرتب بناءً على آخر تحديث
const STAFF_ROLE = '1459353728233636022'; 
const HIGH_ROLE = '1488903490381152450'; 
const EVENT_ROLE = '1465362786467971357'; 

const LOG_CHANNEL_ID = '1488858730924605491'; 
const MAIN_IMAGE = 'https://cdn.discordapp.com/attachments/1488857849349017802/1489642814357639418/background.png';
const RIGHTS_TEXT = 'اهلاً بك في ساحة ريسكبت';

client.once('ready', () => console.log(`${client.user.tag} جاهز للعمل!`));

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
    
    // التعامل مع قائمة الخيارات
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const choice = interaction.values[0];
        if (choice === 'rest') return interaction.reply({ content: 'تم إعادة تهيئة القائمة بنجاح ✅', ephemeral: true });

        const titles = { staff: 'الدعم الفني', high: 'دعم العليا', event: 'دعم الايفنت' };
        const modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle(titles[choice]);
        const issue = new TextInputBuilder()
            .setCustomId('issue_text').setLabel('اشرح مشكلتك').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(issue));
        await interaction.showModal(modal);
    }

    // التعامل مع إرسال البيانات (المودال)
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'rename_modal') {
            const newName = interaction.fields.getTextInputValue('new_name');
            await interaction.channel.setName(newName);
            return interaction.reply({ content: `تم تغيير اسم التذكرة إلى: **${newName}**`, ephemeral: true });
        }

        const type = interaction.customId.replace('modal_', '');
        let targetRole, sectionName;

        if (type === 'staff') { targetRole = STAFF_ROLE; sectionName = 'الدعم الفني'; }
        else if (type === 'high') { targetRole = HIGH_ROLE; sectionName = 'دعم العليا'; }
        else if (type === 'event') { targetRole = EVENT_ROLE; sectionName = 'دعم الايفنت'; }

        try {
            // إنشاء القناة
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: targetRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setDescription(`اهلا بك في **${sectionName}** نتمنى منك الهدوء والصبر وعدم منشن الاداره وسيتم حل مشكلتك في اسرع وقت 👋🏻`)
                .addFields(
                    { name: 'نوع القسم :', value: `\`${sectionName}\``, inline: false },
                    { name: 'يوزر الشخص :', value: `${interaction.user}`, inline: false },
                    { name: 'المشكله او الاستفسار :', value: `\`\`\`${interaction.fields.getTextInputValue('issue_text')}\`\`\``, inline: false }
                )
                .setColor(0x2b2d31)
                .setFooter({ text: RIGHTS_TEXT });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكرة').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('rename_ticket_btn').setLabel('تغيير اسم التذكرة').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('إغلاق وحفظ').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@${interaction.user.id}> | <@&${targetRole}>`, embeds: [welcomeEmbed], components: [buttons] });
            await interaction.reply({ content: `تم فتح تذكرتك بنجاح: ${channel}`, ephemeral: true });

        } catch (error) {
            console.error("خطأ أثناء إنشاء القناة:", error);
            await interaction.reply({ content: 'فشل فتح التذكرة. تأكد أن البوت يمتلك صلاحية Manage Channels وأن رتبته أعلى من رتب الدعم.', ephemeral: true });
        }
    }

    // التعامل مع الأزرار
    if (interaction.isButton()) {
        const hasPerms = interaction.member.roles.cache.has(HIGH_ROLE) || 
                         interaction.member.roles.cache.has(STAFF_ROLE) || 
                         interaction.member.roles.cache.has(EVENT_ROLE);

        if (!hasPerms) return interaction.reply({ content: 'للإدارة فقط.', ephemeral: true });

        if (interaction.customId === 'claim_ticket') {
            const claimEmbed = new EmbedBuilder()
                .setDescription(`✅ تم استلام التدكرة بواسطة : <@${interaction.user.id}>`)
                .setColor(0x43b581);
            
            const components = interaction.message.components[0].components.map(button => {
                const updated = ButtonBuilder.from(button);
                if (button.customId === 'claim_ticket') updated.setDisabled(true).setLabel('تم الاستلام');
                return updated;
            });

            await interaction.update({ components: [new ActionRowBuilder().addComponents(components)] });
            await interaction.followUp({ embeds: [claimEmbed] });
        }

        if (interaction.customId === 'rename_ticket_btn') {
            const modal = new ModalBuilder().setCustomId('rename_modal').setTitle('تغيير اسم التذكرة');
            const input = new TextInputBuilder()
                .setCustomId('new_name').setLabel('اختر الاسم الجديد للتذكرة :').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'delete_ticket') {
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const log = new EmbedBuilder()
                    .setTitle('سجل الإغلاق')
                    .setDescription(`أغلق ${interaction.user} تذكرة \`${interaction.channel.name}\``)
                    .setColor(0xff0000);
                await logChannel.send({ embeds: [log] }).catch(() => {});
            }
            await interaction.reply('جاري الحذف...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
        }
    }
});

client.login(process.env.TOKEN);
