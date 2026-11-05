const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    PermissionsBitField, 
    ChannelType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ==========================================
// الإعدادات البسيطة (ضع الآيديات هنا)
// ==========================================
const config = {
    token: "MTQ4OTMyNDQ4OTUyNjQ4MDk1Ng.GlpV8U.JGA6mbQXfkJ5yez3D8AtIdG1EIDY8cNSCvXumY", 
    prefix: "$",
    probotId: "282859044593598464",
    bankId: "آيدي_حسابك_المستقبل_للتحويل", 
    clientRoleId: "آيدي_رتبة_العميل", 
    ticketCategoryId: "آيدي_قسم_التذاكر"
};

const pendingPayments = new Map(); 

client.on('ready', () => {
    console.log(`✅ البوت يعمل بنجاح باسم: ${client.user.tag}`);
});

// 1. نظام الدفع والتحقق التلقائي ورتبة العميل
client.on('messageCreate', async message => {
    if (!message.author.bot && (message.content.startsWith('c ') || message.content.startsWith('credit '))) {
        pendingPayments.set(message.channel.id, message.author.id);
    }

    if (message.author.id === config.probotId) {
        if (message.content.includes(config.bankId) && (message.content.includes("قام") || message.content.includes("has transferred"))) {
            const payerId = pendingPayments.get(message.channel.id);
            if (payerId) {
                try {
                    const member = await message.guild.members.fetch(payerId);
                    await member.roles.add(config.clientRoleId);

                    const thankYouEmbed = new EmbedBuilder()
                        .setColor('#2b2d31')
                        .setAuthor({ name: 'شكراً لثقتك بنا', iconURL: client.user.displayAvatarURL() })
                        .setDescription(`لأنك اشتريت أحد منتجات المتجر <@${payerId}> , لقد تم إعطائك رتبة <@&${config.clientRoleId}> 🛒`);

                    await message.channel.send({ embeds: [thankYouEmbed] });
                    pendingPayments.delete(message.channel.id);
                } catch (err) {
                    console.error("خطأ في إعطاء الرتبة:", err);
                }
            }
        }
    }

    // 2. نظام الأوامر البسيط
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // أمر الأوامر $help
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🛒 قائمة أوامر المتجر')
            .setDescription('**`$setup-tickets`** : لنشر لوحة فتح التذاكر (للأدمن)\n**`$help`** : لعرض قائمة الأوامر هذه');
        
        return message.channel.send({ embeds: [helpEmbed] });
    }

    // أمر تسطيب التذاكر $setup-tickets
    if (command === 'setup-tickets') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const ticketEmbed = new EmbedBuilder()
            .setColor('#1e1f22')
            .setTitle('لطلب أفتح تذكرة المخصصة للمنتج')
            .setDescription('🔻 لفتح تذكرة أضغط على الزر أدناه 🔻\n\n-------------------------\n\n**Nitro | نايترو** 💎\n**Boosts & Tokens | بوستات & توكنات** 📈\n**Bots & Tools | بوتات & أدوات** 🤖\n**Another Order | طلب آخر** 🛒\n**Inquiry | أستفسار** ❓');

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_menu')
                    .setPlaceholder('يرجى أختيار نوع التذكرة ↓')
                    .addOptions([
                        { label: 'Nitro | نايترو', value: 'Nitro | نايترو', emoji: '💎' },
                        { label: 'Boosts & Tokens | بوستات & توكنات', value: 'Boosts & Tokens', emoji: '📈' },
                        { label: 'Bots & Tools | بوتات & أدوات', value: 'Bots & Tools', emoji: '🤖' },
                        { label: 'Another Order | طلب آخر', value: 'Another Order', emoji: '🛒' },
                        { label: 'Inquiry | أستفسار', value: 'Inquiry', emoji: '❓' },
                    ]),
            );

        await message.channel.send({ embeds: [ticketEmbed], components: [row] });
        if (message.deletable) message.delete();
    }
});

// 3. إنشاء التذكرة عند الاختيار من القائمة
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'ticket_menu') return;

    const ticketType = interaction.values[0];
    
    const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
        ],
    });

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`تذكرة جديدة: ${ticketType}`)
        .setDescription(`مرحباً بك <@${interaction.user.id}>،\nيرجى كتابة تفاصيل طلبك ليتم الرد عليك من قبل طاقم الدعم.\n\nللشراء بواسطة الكريديت، تحول إلى:\n\`c ${config.bankId}\``);

    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeEmbed] });
    await interaction.reply({ content: `✅ تم فتح تذكرتك بنجاح: ${channel}`, ephemeral: true });
});

client.login(config.token);
