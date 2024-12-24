// netflix-telegram-bot.js
require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { ImapFlow } = require("imapflow");
const simpleParser = require("mailparser").simpleParser;
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");

class NetflixWspBot {
  constructor() {
    // Configuración de credenciales
    this.email = process.env.EMAIL;
    this.password = process.env.EMAIL_PASSWORD;
    this.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    this.allowedChatIds = process.env.ALLOWED_CHAT_IDS.split(",").map(
      (id) => id.trim() + "@c.us"
    ); // Inicializar bot de Telegram
    this.allowedChatIdsAdmins = process.env.ALLOWED_CHAT_IDS_ADMINS.split(
      ","
    ).map((id) => id.trim() + "@c.us"); // Inicializar bot de Telegram
    const bot = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox"],
      },
    });
    this.msg = {};
    this.bot = bot;
    this.setupWspCommands();
  }

  setupWspCommands() {
    // Comando /start
    // Cuando se genera el código QR
    this.bot.on("qr", (qr) => {
      console.log("\n=== CÓDIGO QR GENERADO ===");
      qrcode.generate(qr, { small: true });
      console.log("Escanea el código QR con WhatsApp");
    });

    // Cuando el cliente está autenticándose
    this.bot.on("authenticated", () => {
      console.log("\n=== AUTENTICACIÓN EXITOSA ===");
      console.log("El bot se ha autenticado correctamente");
    });

    // Cuando el cliente está listo
    this.bot.on("ready", () => {
      console.log("\n=== BOT LISTO ===");
      console.log("Estado: Activo y escuchando mensajes");
      console.log('Prueba enviando "/start" en cualquier chat de WhatsApp');
    });

    // Log de todos los mensajes recibidos
    this.bot.on("message_create", async (msg) => {
      // Esto capturará TODOS los mensajes, incluso los tuyos
      console.log("\n=== MENSAJE DETECTADO ===");
      console.log("De:", msg.from);
      console.log("Mensaje:", msg.body);
      console.log("Tipo:", msg.type);
      console.log("fromMe:", msg.fromMe);
      

      let sMsgStart =  "👋 ¡Hola! Soy tu bot de confirmación de Netflix.\n\n" +
      "Comandos disponibles:\n" +
      "📌 */start* - Muestra el menú\n" +
      "🔍 */active_hogar* - Busca nuevas solicitudes de Actualizar dispositivo Hogar\n" +
      "🔍 */active_login* - Busca nuevas solicitudes de Inicio de sesión (*)\n" +
      "🔍 */get_code* - Busca nuevos códigos de confirmación (Móvil) (*)\n" +
      "👤 */get_user* - Muestra el usuario\n" +
      "🔑 */get_pass* - Muestra la contraseña actual\n" +
      "📊 */status* - Muestra el estado del bot\n\n"+
      "El comando debe comenzar con / \nEjemplo: */start* = ✅, *start* = ❌\n\n"+
      "Comandos con (*) solo para administradores";

      // Ignorar mensajes del propio bot
      if (msg.fromMe) return;
      
      // Si el mensaje no es un comando, mostrar lista de comandos
      if (!msg.body.startsWith("/")) {
        await msg.reply(sMsgStart);
        return;
      }

      // Verificar si el mensaje es un comando

      if (!msg.body.startsWith("/")) return;
      this.msg = msg;
      const command = msg.body.toLowerCase();

      switch (command) {
        case "/start":
            await msg.reply(sMsgStart);
          break;

        case "/active_login":
          if (this.isAuthorizedAdmin(msg.from)) {
            await msg.reply("🔍 Buscando nuevas solicitudes de Netflix...");
            try {
              const results = await this.checkEmails(null, "login");
              //await msg.reply(results);
            } catch (error) {
              await msg.reply(
                "❌ Error al buscar solicitudes: " + error.message
              );
            }
          } else {
            await msg.reply("❌ No tienes permisos para ejecutar este comando");
          }
          break;
        case "/active_hogar":
          if (this.isAuthorized(msg.from) || this.isAuthorizedAdmin(msg.from)) {
            await msg.reply("🔍 Buscando nuevas solicitudes de Netflix...");
            try {
              const results = await this.checkEmails(null, "hogar");
              //await msg.reply(results);
            } catch (error) {
              await msg.reply(
                "❌ Error al buscar solicitudes: " + error.message
              );
            }
          } else {
            await msg.reply("❌ No tienes permisos para ejecutar este comando");
          }
          break;
        case "/get_code":
          if (this.isAuthorizedAdmin(msg.from)) {
            await msg.reply("🔍 Buscando nuevas solicitudes de Netflix...");
            try {
              const results = await this.checkEmails(null, "code");
              //await msg.reply(results);
            } catch (error) {
              await msg.reply(
                "❌ Error al buscar solicitudes: " + error.message
              );
            }
          } else {
            await msg.reply("❌ No tienes permisos para ejecutar este comando");
          }
          break;
        case "/status":
          await msg.reply(
            "✅ Bot activo y funcionando\n" +
            "📧 Conectado\n" +
            "🤖 Listo para procesar solicitudes"
          );
          break;
        case "/get_user":
          if (this.isAuthorized(msg.from) || this.isAuthorizedAdmin(msg.from)) {
            await msg.reply(
              "✅ Usuario:"
            );
            await this.notifyWsp(
              process.env.APP_NETFLIX_U
            );
          } else {
            await msg.reply("❌ No tienes permisos para ejecutar este comando");
          }
            break;
        case "/get_pass":
          if (this.isAuthorized(msg.from) || this.isAuthorizedAdmin(msg.from)) {
          await msg.reply(
            "✅ Contraseña:"
          );
          await this.notifyWsp(
            process.env.APP_NETFLIX_P
          );
        } else {
          await msg.reply("❌ No tienes permisos para ejecutar este comando");
        }
          break;
          
      }
    });

    this.bot.on("message", async (msg) => {
      return;
      this.msg = msg;
      const command = msg.body.toLowerCase();

      switch (command) {
        case "/start":
          await msg.reply(
            "👋 ¡Hola! Soy tu bot de confirmación de Netflix.\n\n" +
            "Comandos disponibles:\n" +
            "📌 /start - Muestra este mensaje\n" +
            "🔍 /check - Busca nuevas solicitudes\n" +
            "📊 /status - Muestra el estado del bot"
          );
          break;

        case "/check":
          await msg.reply("🔍 Buscando nuevas solicitudes de Netflix...");
          try {
            const results = await this.checkEmails();
            await msg.reply(results);
          } catch (error) {
            await msg.reply("❌ Error al buscar solicitudes: " + error.message);
          }
          break;

        case "/status":
          await msg.reply(
            "✅ Bot activo y funcionando\n" +
            "📧 Conectado\n" +
            "🤖 Listo para procesar solicitudes"
          );
          break;
      }
    });
  }

  isAuthorized(chatId) {
    return this.allowedChatIds.includes(chatId.toString());
  }
  isAuthorizedAdmin(chatId) {
    return this.allowedChatIdsAdmins.includes(chatId.toString());
  }
  async setupBrowser() {
    try {
      puppeteer.use(StealthPlugin());
      const userDataDir = 'E:\.pupeeter_data';

      // Si ya existe un navegador, cerrarlo primero
      if (this.browser) {
        try {
          await this.browser.close();
        } catch (e) {
          console.log('Error al cerrar navegador existente:', e);
        }
      }

      // Configuración mejorada del navegador
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=IsolateOrigins",
          "--disable-site-isolation-trials",
          "--no-experiments",
          "--ignore-certificate-errors",
          "--ignore-certificate-errors-spki-list",
          "--disable-accelerated-2d-canvas",
          "--disable-infobars"
        ],
        ignoreHTTPSErrors: true,
        userDataDir: userDataDir,
        timeout: 60000
      });

      // Manejadores de eventos para el navegador
      this.browser.on('disconnected', async () => {
        console.log('Navegador desconectado. Intentando reconectar...');
        await this.reconnectBrowser();
      });

      this.browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
          const page = await target.page();
          this.setupPageErrorHandlers(page);
        }
      });

      return this.browser;
    } catch (error) {
      console.error('Error al iniciar navegador:', error);
      await this.handleBrowserError(error);
    }
  }

  async reconnectBrowser() {
    try {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
      await this.setupBrowser();
    } catch (error) {
      console.error('Error en la reconexión:', error);
    }
  }

  setupPageErrorHandlers(page) {
    page.on('error', error => {
      console.error('Error en la página:', error);
    });

    page.on('pageerror', error => {
      console.error('Error de página:', error);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Error de consola:', msg.text());
      }
    });
  }

  async handleBrowserError(error) {
    console.error('Error en el navegador:', error);

    // Intentar limpiar recursos
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        console.error('Error al cerrar navegador:', e);
      }
      this.browser = null;
    }

    // Intentar reconectar
    await this.reconnectBrowser();
  }

  async connectToGmail() {
    try {
      const client = new ImapFlow({
        host: "imap.gmail.com",
        port: 993,
        secure: true,
        tls: {
          rejectUnauthorized: false,
        },
        auth: {
          user: this.email,
          pass: this.password,
        },
      });

      await client.connect();
      return client;
    } catch (error) {
      console.error("Error conectando a Gmail:", error);
      this.notifyError("❌ Error conectando a Gmail");
      return null;
    }
  }

  async getNetflixEmails(client, opt = "login") {
    try {
      // Crear fechas directamente en UTC-5
      const now = new Date(); // Ajustar a UTC-5
      now.setHours(now.getHours() - 5);
      const fiveMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      console.log({
        zonaHoraria: "UTC-5",
        horaActual: new Date().toLocaleString("es-PE"),
        horaBusqueda: fiveMinutesAgo.toISOString(),
        fechaBusqueda: fiveMinutesAgo,
      });

      await client.mailboxOpen("INBOX");

      let sSubject = "";

      switch (opt) {
        case "login":
          sSubject = "Netflix: Nueva solicitud de inicio de sesión";
          break;
        case "hogar":
          sSubject = "Importante: Cómo actualizar tu Hogar con Netflix";
          break;
        case "code":
          sSubject = "Netflix: Tu código de inicio de sesión";
          break;
      }

      const results = await client.search({
        unseen: true,
        since: fiveMinutesAgo,
        from: "info@account.netflix.com",
        subject: sSubject,
      });

      return results;
    } catch (error) {
      console.error("Error buscando emails:", error);
      this.notifyError("❌ Error buscando emails de Netflix");
      return [];
    }
  }

  async processEmail(client, message) {
    try {
      //console.log(message);
      //console.log(message.uid);
      const fetch = await client.download(message);
      //console.log("fetch", fetch);
      //console.log("content", fetch.content);
      const parsed = await simpleParser(fetch.content);
      //console.log("parsed", parsed.html);
      return parsed.html;
    } catch (error) {
      console.error("Error procesando email:", error);
      return null;
    }
  }

  extractConfirmationLink(htmlContent, opt = "login", chatId = null) {
    try {
      const $ = cheerio.load(htmlContent); // Ajusta este selector según el formato real del correo de Netflix // Opción 1: Buscar por texto exacto
      const sSearch = opt == "login" ? "Aprobar" : "Sí, la envié yo";
      const confirmationLink = $('a:contains("' + sSearch + '")')
        .first()
        .attr("href"); // Opción 2: Si necesitas una búsqueda más flexible

      let requestInfoArr = [];

      switch (opt) {
        case "hogar":
          // Extraer información de la solicitud
          const requestInfo = $('td[align="left"]')
            .filter(function () {
              return $(this).text().includes("Solicitud de");
            })
            .map(function () {
              const fullText = $(this).text().trim();

              // Extraer el dispositivo
              const deviceMatch = $(this).find("b").text().trim();

              // Extraer el nombre del solicitante
              const requestMatch = fullText.match(/Solicitud de ([^,]+)/);
              const requester = requestMatch ? requestMatch[1].trim() : "";

              // Extraer fecha y hora
              const dateTimeMatch = fullText.match(/el (.+)$/);
              const dateTime = dateTimeMatch ? dateTimeMatch[1].trim() : "";

              return {
                fullText: fullText,
                requester: requester,
                device: deviceMatch,
                dateTime: dateTime,
                rawHtml: $(this).html(),
              };
            })
            .get();

          // Verificar si se encontró la información
          if (requestInfo.length > 0) {
            requestInfoArr = requestInfo;
            console.log("Información de la solicitud:", requestInfoArr[0]);
          }
          break;
        case "login":
          const deviceText = $("td")
            .filter(function () {
              const style = $(this).attr("style") || "";
              const text = $(this).text().trim();

              // Verificar si el estilo contiene las propiedades clave, ignorando espacios
              const hasNetflixFont = style.includes("Netflix Sans");
              const hasFontSize24 = style
                .replace(/\s+/g, "")
                .includes("font-size:24px");
              const isAlignCenter = $(this).attr("align") === "center";

              return hasNetflixFont && hasFontSize24 && isAlignCenter;
            })
            .text()
            .trim();

          console.log("Dispositivo:", deviceText); // Ahora debería mostrar "LG - Smart TV"

          requestInfoArr.push(deviceText);
          //await this.notifyWsp(`📱 Dispositivo: ${deviceText}`, chatId);
          break;
        case "code":
          const code = $('td[style*="letter-spacing: 6px"]').text().trim();

          console.log("Código:", code); // Ahora debería mostrar "LG - Smart TV"

          requestInfoArr.push(code);
          //await this.notifyWsp(`📱 Dispositivo: ${deviceText}`, chatId);
          break;
      }

      if (!confirmationLink && opt != "code") {
        // Buscar todos los enlaces y filtrar
        const allLinks = $("a").toArray();
        for (const link of allLinks) {
          const text = $(link).text().trim().toLowerCase();
          if (text.includes(sSearch)) {
            return $(link).attr("href");
          }
        }
      } // Opción 3: Si necesitas depurar

      if (!confirmationLink && opt != "code") {
        console.log("Enlaces encontrados:");
        $("a").each((i, elem) => {
          console.log({
            text: $(elem).text().trim(),
            href: $(elem).attr("href"),
          });
        });
      }

      console.log({ confirmationLink, requestInfo: requestInfoArr[0] });
      return { confirmationLink, requestInfo: requestInfoArr[0] };
    } catch (error) {
      console.error("Error extrayendo link:", error);
      return null;
    }
  }
  // Función para guardar el HTML
  async savePageContent(page, prefix = "debug") {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fs = require("fs").promises;

      // Obtener el HTML completo
      const htmlContent = await page.content();

      // Guardar el HTML
      const htmlFileName = `${prefix}-page-${timestamp}.html`;
      await fs.writeFile(htmlFileName, htmlContent);

      // Tomar también un screenshot
      const screenshotFileName = `${prefix}-screenshot-${timestamp}.png`;
      await page.screenshot({
        path: screenshotFileName,
        fullPage: true,
      });

      // Obtener también el HTML evaluado
      const evaluatedContent = await page.evaluate(() => {
        return {
          documentState: document.readyState,
          innerHtml: document.documentElement.innerHTML,
          bodyText: document.body.innerText,
          buttons: Array.from(document.querySelectorAll("button")).map(
            (button) => ({
              text: button.innerText,
              id: button.id,
              className: button.className,
              attributes: Array.from(button.attributes).map((attr) => ({
                name: attr.name,
                value: attr.value,
              })),
            })
          ),
        };
      });

      // Guardar la información evaluada
      const evalFileName = `${prefix}-evaluated-${timestamp}.json`;
      await fs.writeFile(
        evalFileName,
        JSON.stringify(evaluatedContent, null, 2)
      );

      console.log("Archivos guardados:");
      console.log("- HTML:", htmlFileName);
      console.log("- Screenshot:", screenshotFileName);
      console.log("- Evaluated Content:", evalFileName);

      return {
        htmlFile: htmlFileName,
        screenshotFile: screenshotFileName,
        evalFile: evalFileName,
      };
    } catch (error) {
      console.error("Error guardando contenido de la página:", error);
      return null;
    }
  }

  async confirmAccess(confirmationLink, opt = "login") {
    const page = await this.browser.newPage();
    // Configurar timeout más largo
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    try {
      // Navegar a la página
      console.log("Navegando a:", confirmationLink);
      await page.goto(confirmationLink, {
        waitUntil: ["networkidle0", "domcontentloaded", "load"],
        timeout: 30000,
      });

      // Guardar estado inicial
      //console.log('Guardando estado inicial de la página...');
      //await this.savePageContent(page, 'initial');

      // Esperar que el DOM esté completamente cargado
      await page.waitForFunction(() => document.readyState === "complete");

      // Verificar que no hay peticiones de red pendientes
      await page.waitForFunction(() => !window.fetch.inProgress, {
        timeout: 10000,
      });

      // Esperar a que la página se cargue completamente
      await new Promise((resolve) => setTimeout(resolve, 7000));

      // Guardar estado después de espera
      //console.log('Guardando estado después de espera...');
      //await this.savePageContent(page, 'after-wait');

      console.log(page.url());

      if (opt == "hogar") {
        // Intentar diferentes estrategias para encontrar el botón
        try {
          // Por texto del botón
          // Intentar diferentes estrategias para encontrar el botón específico
          const buttonSelector =
            'button[data-uia="set-primary-location-action"]';

          // Esperar a que el botón esté disponible
          await page.waitForSelector(buttonSelector, {
            visible: true,
            timeout: 10000,
          });

          // Intentar hacer clic de diferentes maneras
          try {
            // Método 1: Click directo
            await page.click(buttonSelector);
          } catch (error) {
            console.log(
              "Primer método de click falló, intentando alternativa..."
            );

            // Método 2: Evaluación en el contexto de la página
            await page.evaluate((selector) => {
              const button = document.querySelector(selector);
              if (button) button.click();
            }, buttonSelector);
          }

          // Esperar después del clic
          await new Promise((resolve) => setTimeout(resolve, 5000));

          console.log("Botón clickeado exitosamente");

          // Esperar después del clic
          //await new Promise(resolve => setTimeout(resolve, 5000));
          return true;
          // Verificar si hay mensaje de éxito
          // const bodyText = await page.evaluate(() => document.body.innerText);
          // if (bodyText.toLowerCase().includes('confirmado') ||
          // bodyText.toLowerCase().includes('confirmed') ||
          // bodyText.toLowerCase().includes('success')) {
          // console.log('Acceso confirmado exitosamente');
          // return true;
          // }
        } catch (clickError) {
          console.error("Error al intentar hacer clic:", clickError);

          // Guardar screenshot para debug
          await page.screenshot({ path: `error-screenshot-${Date.now()}.png` });

          // Imprimir HTML para debug
          const html = await page.content();
          //console.log("HTML de la página:", html);
        }
      }
      return true;
    } catch (error) {
      console.error("Error confirmando acceso:", error);
      return false;
    } finally {
      await page.close();
    }
  }

  async notifyWsp(message) {
    //if (chatId) {
    await this.bot.sendMessage(this.msg.from, message);
    /* } else {
      // Notificar a todos los chats autorizados
      for (const id of this.allowedChatIds) {
        await this.bot.telegram.sendMessage(id, message);
      }
    } */
  }

  async notifyError(error) {
    const errorMessage = `❌ Error: ${error}`;
    await this.notifyWsp(errorMessage);
  }

  async checkEmails(chatId = null, opt = "login") {
    try {
      await this.setupBrowser();
      const client = await this.connectToGmail();

      if (!client) {
        return;
      }

      const messages = await this.getNetflixEmails(client, opt);
      console.log(messages);
      if (messages.length === 0) {
        await this.notifyWsp("❌ No hay nuevas solicitudes de Netflix", chatId);
        return;
      }
      console.log(`Encontrados ${messages.length} correos de Netflix`);
      for (const message of messages) {
        const htmlContent = await this.processEmail(client, message);
        if (htmlContent) {
          const {
            confirmationLink,
            requestInfo,
          } = this.extractConfirmationLink(htmlContent, opt, chatId);
          //if (confirmationLink) {
          await this.notifyWsp(
            "🔍 Nueva solicitud de Netflix detectada. Identificando...",
            chatId
          );
          if (requestInfo) {
            switch (opt) {
              case "hogar":
                await this.notifyWsp(
                  `📄 Detalles de la Solicitud:\n\n📅 Fecha: ${requestInfo.dateTime}\n👤 Solicitante/Perfil: ${requestInfo.requester}\n📱 Dispositivo: ${requestInfo.device}`,
                  chatId
                );
                break;
              case "login":
                //if (isAuthorizedAdmin(chatId)) {
                await this.notifyWsp(`📱 Dispositivo: ${requestInfo}`, chatId);
                //}
                break;
            }
            if (opt == "code") {
              await this.notifyWsp(`✅ Código de confirmación: ${requestInfo}`, chatId);
              await client.messageFlagsAdd(message, ["\\Seen"]);
            } else {
              await this.notifyWsp(`🔄 Procesando solicitud ...`, chatId);
            }
          }

          console.log(confirmationLink);

          if (opt != "code") {
            const success = await this.confirmAccess(confirmationLink, opt); //const success = true;
            if (success) {
              await this.notifyWsp(
                "✅ Acceso confirmado, verifique en su TV/Smartphone",
                chatId
              );
              await client.messageFlagsAdd(message, ["\\Seen"]);
            } else {
              await this.notifyWsp("❌ Error al confirmar el acceso", chatId);
            }
          }
          //}
        }
      }
    } catch (error) {
      console.error("Error en la ejecución:", error);
      await this.notifyError("❌ Error general en la ejecución");
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  start() {
    // Iniciar el bot de Telegram
    this.bot.initialize(); // Configurar verificación periódica de correos //setInterval(() => this.checkEmails(), 5 * 60 * 1000); // Cada 5 minutos

    console.log("Bot iniciado y monitoreando correos...");
    // qrcode.generate({ small: true });
  }
}

// Crear archivo .env con las siguientes variables:
/*
EMAIL=tu_correo@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicación
TELEGRAM_BOT_TOKEN=tu_token_de_bot_telegram
ALLOWED_CHAT_IDS=id1,id2,id3
*/

// Crear y ejecutar el bot
const bot = new NetflixWspBot();
bot.start();

// Manejar el cierre graceful
//process.once("SIGINT", () => bot.bot.stop("SIGINT"));
//process.once("SIGTERM", () => bot.bot.stop("SIGTERM"));
