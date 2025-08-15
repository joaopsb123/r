import discord
import random
import asyncio
import json
import os
import datetime
from discord.ext import commands
from discord.ui import Button, View, Select, Modal, TextInput
from discord import app_commands
from typing import Optional

Configuração Inicial

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)
TOKEN = "SEU_TOKEN_AQUI"

Banco de Dados

def carregar_dados():
dados = {
'economia': {},
'moderacao': {},
'registros': {},
'ponto': {},
'farms': {},
'tickets': {},
'cargos': {},
'config': {},
'logs': {},
'boas_vindas': {},
'sugestoes': {},
'eventos': {},
'anuncios': {}
}

for arquivo in dados.keys():  
    try:  
        with open(f'dados/{arquivo}.json', 'r') as f:  
            dados[arquivo] = json.load(f)  
    except (FileNotFoundError, json.JSONDecodeError):  
        pass  
  
return dados

def salvar_dados(dados, arquivo):
os.makedirs('dados', exist_ok=True)
with open(f'dados/{arquivo}.json', 'w') as f:
json.dump(dados[arquivo], f, indent=4)

dados = carregar_dados()

======================

SISTEMA DE AJUDA MELHORADO

======================

@bot.hybrid_command(name="ajuda", description="Mostra todos os comandos do bot")
async def ajuda(ctx):
embed = discord.Embed(
title="🛠️ Central de Ajuda - Lily Bot",
description="Todos os comandos disponíveis organizados por categorias:",
color=0x8A2BE2
)

# Economia  
embed.add_field(  
    name="💰 Economia",  
    value="""`/perfil` - Ver seu perfil

/adicionarmoedas - Adicionar moedas (ADM)
/farm add - Adicionar local de farm
/farm list - Listar farms""",
inline=False
)

# Moderação  
embed.add_field(  
    name="🛡️ Moderação",  
    value="""`/config` - Configurar o bot

/registrar - Registrar um membro
/ban - Banir um membro
/kick - Expulsar um membro
/limpar - Limpar mensagens""",
inline=False
)

# Tickets  
embed.add_field(  
    name="🎫 Tickets",  
    value="""`/ticket setup` - Configurar tickets

/ticket add - Adicionar cargo ao ticket
/ticket close - Fechar ticket""",
inline=False
)

# Utilitários  
embed.add_field(  
    name="🔧 Utilitários",  
    value="""`/baterponto` - Registrar ponto

/solicitarcargo - Solicitar um cargo
/sugerir - Enviar uma sugestão
/evento criar - Criar um evento""",
inline=False
)

embed.set_footer(text="Lily Bot - Sistema completo para seu servidor")  
await ctx.send(embed=embed)

======================

SISTEMA DE CONFIGURAÇÃO MELHORADO

======================

@bot.hybrid_command(name="config", description="Configurar o bot no servidor")
@commands.has_permissions(administrator=True)
async def config(ctx):
embed = discord.Embed(
title="⚙️ Configuração do Lily Bot",
description="Escolha o que deseja configurar:",
color=0x9370DB
)
embed.set_thumbnail(url=bot.user.avatar.url)

view = View()  
  
# Botões de configuração  
cargos_btn = Button(label="🛡️ Cargos Automáticos", style=discord.ButtonStyle.blurple, emoji="⚙️")  
boasvindas_btn = Button(label="👋 Boas-Vindas", style=discord.ButtonStyle.green, emoji="🎉")  
tickets_btn = Button(label="🎫 Tickets", style=discord.ButtonStyle.gray, emoji="📩")  
logs_btn = Button(label="📜 Logs", style=discord.ButtonStyle.blurple, emoji="📝")  
sugerir_btn = Button(label="💡 Sugestões", style=discord.ButtonStyle.green, emoji="✨")  
  
async def cargos_callback(interaction):  
    modal = ConfigCargosModal()  
    await interaction.response.send_modal(modal)  
  
async def boasvindas_callback(interaction):  
    modal = ConfigBoasVindasModal()  
    await interaction.response.send_modal(modal)  
  
async def tickets_callback(interaction):  
    await interaction.response.send_message("Configuração de tickets:", view=ConfigTicketsView())  
  
async def logs_callback(interaction):  
    modal = ConfigLogsModal()  
    await interaction.response.send_modal(modal)  
  
async def sugerir_callback(interaction):  
    modal = ConfigSugestoesModal()  
    await interaction.response.send_modal(modal)  
  
cargos_btn.callback = cargos_callback  
boasvindas_btn.callback = boasvindas_callback  
tickets_btn.callback = tickets_callback  
logs_btn.callback = logs_callback  
sugerir_btn.callback = sugerir_callback  
  
view.add_item(cargos_btn)  
view.add_item(boasvindas_btn)  
view.add_item(tickets_btn)  
view.add_item(logs_btn)  
view.add_item(sugerir_btn)  
  
await ctx.send(embed=embed, view=view)

Modais de Configuração

class ConfigCargosModal(Modal, title="Configurar Cargos Automáticos"):
def init(self):
super().init()
self.add_item(TextInput(label="ID Cargo Membro", placeholder="1234567890", required=True))
self.add_item(TextInput(label="ID Cargo Notificações", placeholder="Opcional", required=False))
self.add_item(TextInput(label="ID Cargo Eventos", placeholder="Opcional", required=False))

async def on_submit(self, interaction: discord.Interaction):  
    guild_id = str(interaction.guild.id)  
    dados['cargos'][guild_id] = {  
        "membro": self.children[0].value,  
        "notificacoes": self.children[1].value or None,  
        "eventos": self.children[2].value or None  
    }  
    salvar_dados(dados, 'cargos')  
    embed = discord.Embed(  
        title="✅ Configuração Salva",  
        description="Cargos automáticos foram configurados com sucesso!",  
        color=0x00FF00  
    )  
    await interaction.response.send_message(embed=embed, ephemeral=True)

class ConfigBoasVindasModal(Modal, title="Configurar Sistema de Boas-Vindas"):
def init(self):
super().init()
self.add_item(TextInput(label="ID do Canal", placeholder="1234567890", required=True))
self.add_item(TextInput(label="Mensagem", style=discord.TextStyle.long,
placeholder="Bem-vindo {membro} ao {servidor}!", required=True))

async def on_submit(self, interaction: discord.Interaction):  
    guild_id = str(interaction.guild.id)  
    dados['boas_vindas'][guild_id] = {  
        "canal_id": self.children[0].value,  
        "mensagem": self.children[1].value  
    }  
    salvar_dados(dados, 'boas_vindas')  
    embed = discord.Embed(  
        title="✅ Configuração Salva",  
        description="Mensagem de boas-vindas configurada com sucesso!",  
        color=0x00FF00  
    )  
    await interaction.response.send_message(embed=embed, ephemeral=True)

class ConfigLogsModal(Modal, title="Configurar Canal de Logs"):
def init(self):
super().init()
self.add_item(TextInput(label="ID do Canal", placeholder="1234567890", required=True))

async def on_submit(self, interaction: discord.Interaction):  
    guild_id = str(interaction.guild.id)  
    dados['logs'][guild_id] = {  
        "canal_id": self.children[0].value  
    }  
    salvar_dados(dados, 'logs')  
    embed = discord.Embed(  
        title="✅ Configuração Salva",  
        description="Canal de logs configurado com sucesso!",  
        color=0x00FF00  
    )  
    await interaction.response.send_message(embed=embed, ephemeral=True)

class ConfigSugestoesModal(Modal, title="Configurar Sistema de Sugestões"):
def init(self):
super().init()
self.add_item(TextInput(label="ID do Canal", placeholder="1234567890", required=True))

async def on_submit(self, interaction: discord.Interaction):  
    guild_id = str(interaction.guild.id)  
    dados['sugestoes'][guild_id] = {  
        "canal_id": self.children[0].value  
    }  
    salvar_dados(dados, 'sugestoes')  
    embed = discord.Embed(  
        title="✅ Configuração Salva",  
        description="Canal de sugestões configurado com sucesso!",  
        color=0x00FF00  
    )  
    await interaction.response.send_message(embed=embed, ephemeral=True)

class ConfigTicketsView(View):
def init(self):
super().init(timeout=None)

categorias = [  
        discord.SelectOption(label="Suporte", value="suporte"),  
        discord.SelectOption(label="Denúncia", value="denuncia"),  
        discord.SelectOption(label="Dúvida", value="duvida"),  
        discord.SelectOption(label="Outro", value="outro")  
    ]  
      
    self.select = Select(  
        placeholder="Selecione o tipo de ticket",  
        options=categorias,  
        custom_id="ticket_type_select"  
    )  
    self.add_item(self.select)  
      
    self.cargo_input = TextInput(  
        label="ID do Cargo para Aprovação",  
        placeholder="1234567890",  
        required=True  
    )  
  
@discord.ui.button(label="Salvar Configuração", style=discord.ButtonStyle.green)  
async def save_config(self, interaction: discord.Interaction, button: Button):  
    modal = Modal(title="Configurar Cargo de Tickets")  
    modal.add_item(self.cargo_input)  
      
    async def on_submit(interaction: discord.Interaction):  
        guild_id = str(interaction.guild.id)  
        tipo_ticket = self.select.values[0] if self.select.values else "suporte"  
          
        if guild_id not in dados['tickets']:  
            dados['tickets'][guild_id] = {}  
              
        dados['tickets'][guild_id][tipo_ticket] = {  
            "cargo_id": self.cargo_input.value,  
            "categoria_id": None  # Pode ser configurado depois  
        }  
          
        salvar_dados(dados, 'tickets')  
        await interaction.response.send_message(  
            f"✅ Configuração de tickets para '{tipo_ticket}' salva com sucesso!",  
            ephemeral=True  
        )  
      
    modal.on_submit = on_submit  
    await interaction.response.send_modal(modal)

======================

SISTEMA DE TICKETS (CORRIGIDO)

======================

@bot.hybrid_command(name="ticket", description="Gerencie o sistema de tickets")
@commands.has_permissions(manage_channels=True)
async def ticket(ctx, acao: str = None):
if not acao:
embed = discord.Embed(
title="🎫 Sistema de Tickets",
description="""Comandos disponíveis:
/ticket setup - Configurar o sistema
/ticket panel - Criar painel de tickets
/ticket add @cargo - Adicionar cargo ao ticket
/ticket close - Fechar ticket""",
color=0x7289DA
)
return await ctx.send(embed=embed)

if acao == "setup":  
    await ctx.send("Configuração de tickets:", view=ConfigTicketsView())  
elif acao == "panel":  
    embed = discord.Embed(  
        title="📨 Criar Ticket",  
        description="Clique no botão abaixo para criar um ticket de suporte!",  
        color=0x7289DA  
    )  
    view = View()  
    button = Button(label="Abrir Ticket", style=discord.ButtonStyle.blurple, emoji="📩")  
      
    async def button_callback(interaction):  
        guild_id = str(interaction.guild.id)  
        if guild_id not in dados['tickets']:  
            return await interaction.response.send_message(  
                "O sistema de tickets não está configurado!",  
                ephemeral=True  
            )  
          
        # Cria o canal do ticket  
        categoria = discord.utils.get(interaction.guild.categories, name="TICKETS")  
        if not categoria:  
            categoria = await interaction.guild.create_category("TICKETS")  
          
        overwrites = {  
            interaction.guild.default_role: discord.PermissionOverwrite(read_messages=False),  
            interaction.user: discord.PermissionOverwrite(read_messages=True)  
        }  
          
        canal = await categoria.create_text_channel(  
            f"ticket-{interaction.user.name}",  
            overwrites=overwrites  
        )  
          
        embed = discord.Embed(  
            title=f"Ticket de {interaction.user.name}",  
            description="A equipe de suporte logo estará aqui para te ajudar!",  
            color=0x7289DA  
        )  
        embed.set_footer(text="Digite /ticket close para fechar este ticket")  
          
        view = View()  
        close_btn = Button(label="Fechar Ticket", style=discord.ButtonStyle.red)  
          
        async def close_callback(interaction):  
            # VERIFICAÇÃO DE PERMISSÃO CORRIGIDA  
            cargos_permitidos = [int(data['cargo_id']) for data in dados['tickets'][guild_id].values() if 'cargo_id' in data]  
            tem_permissao = any(role.id in cargos_permitidos for role in interaction.user.roles)  
              
            if not tem_permissao and not interaction.user.guild_permissions.manage_channels:  
                return await interaction.response.send_message(  
                    "Você não tem permissão para fechar este ticket!",  
                    ephemeral=True  
                )  
              
            await canal.delete()  
            await interaction.response.send_message(  
                f"Ticket fechado por {interaction.user.mention}",  
                ephemeral=True  
            )  
          
        close_btn.callback = close_callback  
        view.add_item(close_btn)  
          
        await canal.send(interaction.user.mention, embed=embed, view=view)  
        await interaction.response.send_message(  
            f"Seu ticket foi criado: {canal.mention}",  
            ephemeral=True  
        )  
      
    button.callback = button_callback  
    view.add_item(button)  
    await ctx.send(embed=embed, view=view)

@bot.hybrid_command(name="fecharticket", description="Fechar um ticket")
async def fecharticket(ctx):
if "ticket-" not in ctx.channel.name:
return await ctx.send("Este comando só pode ser usado em tickets!", ephemeral=True)

guild_id = str(ctx.guild.id)  
if guild_id not in dados['tickets']:  
    return await ctx.send("Sistema de tickets não configurado!", ephemeral=True)  
  
# VERIFICAÇÃO DE PERMISSÃO CORRIGIDA  
cargos_permitidos = [int(data['cargo_id']) for data in dados['tickets'][guild_id].values() if 'cargo_id' in data]  
tem_permissao = any(role.id in cargos_permitidos for role in ctx.author.roles)  
  
if not tem_permissao and not ctx.author.guild_permissions.manage_channels:  
    return await ctx.send("Você não tem permissão para fechar tickets!", ephemeral=True)  
  
await ctx.send("Fechando ticket em 5 segundos...")  
await asyncio.sleep(5)  
await ctx.channel.delete()

======================

SISTEMA DE REGISTRO

======================

@bot.hybrid_command(name="registrar", description="Registrar um membro no servidor")
@commands.has_permissions(manage_roles=True)
async def registrar(ctx, membro: discord.Member, *, registro: str):
guild_id = str(ctx.guild.id)
user_id = str(membro.id)

if guild_id not in dados['registros']:  
    dados['registros'][guild_id] = {}  
  
dados['registros'][guild_id][user_id] = {  
    "registrado_por": str(ctx.author.id),  
    "data": datetime.datetime.now().isoformat(),  
    "info": registro  
}  
salvar_dados(dados, 'registros')  
  
embed = discord.Embed(  
    title="✅ Registro Concluído",  
    description=f"{membro.mention} foi registrado com sucesso!",  
    color=0x00FF00  
)  
embed.add_field(name="Registrado por", value=ctx.author.mention)  
embed.add_field(name="Informações", value=registro)  
embed.set_footer(text=f"ID: {user_id}")  
  
await ctx.send(embed=embed)  
  
# Adiciona cargo de membro registrado se configurado  
if guild_id in dados['cargos'] and dados['cargos'][guild_id]['membro']:  
    cargo = ctx.guild.get_role(int(dados['cargos'][guild_id]['membro']))  
    if cargo:  
        await membro.add_roles(cargo, reason="Registro no servidor")

======================

SISTEMA BATE-PONTO

======================

@bot.hybrid_command(name="baterponto", description="Registrar seu ponto diário")
async def baterponto(ctx):
user_id = str(ctx.author.id)
hoje = datetime.datetime.now().strftime("%Y-%m-%d")

if 'ponto' not in dados:  
    dados['ponto'] = {}  
  
if user_id not in dados['ponto']:  
    dados['ponto'][user_id] = {}  
  
if hoje in dados['ponto'][user_id]:  
    embed = discord.Embed(  
        title="⚠️ Ponto já Registrado",  
        description="Você já bateu o ponto hoje!",  
        color=0xFFA500  
    )  
    return await ctx.send(embed=embed, ephemeral=True)  
  
dados['ponto'][user_id][hoje] = datetime.datetime.now().isoformat()  
salvar_dados(dados, 'ponto')  
  
embed = discord.Embed(  
    title="✅ Ponto Registrado",  
    description=f"Ponto batido com sucesso em {datetime.datetime.now().strftime('%H:%M')}",  
    color=0x00FF00  
)  
embed.set_footer(text="Volte amanhã para bater o ponto novamente")  
  
await ctx.send(embed=embed)  
  
# Recompensa em moedas  
if user_id not in dados['economia']:  
    dados['economia'][user_id] = {"moedas": 0}  
  
dados['economia'][user_id]["moedas"] += 50  
salvar_dados(dados, 'economia')

======================

SISTEMA DE FARMS

======================

@bot.hybrid_command(name="farm", description="Gerencie locais de farm")
async def farm(ctx, acao: str = None, *, local: str = None):
if not acao:
embed = discord.Embed(
title="🌾 Sistema de Farms",
description="""Comandos disponíveis:
/farm add <local> - Adicionar local de farm
/farm remove <local> - Remover local de farm
/farm list - Listar todos os farms""",
color=0x32CD32
)
return await ctx.send(embed=embed)

guild_id = str(ctx.guild.id)  
  
if acao == "add" and local:  
    if 'farms' not in dados:  
        dados['farms'] = {}  
      
    if guild_id not in dados['farms']:  
        dados['farms'][guild_id] = []  
      
    if local in dados['farms'][guild_id]:  
        embed = discord.Embed(  
            title="⚠️ Farm Existente",  
            description="Este local de farm já está registrado!",  
            color=0xFFA500  
        )  
        return await ctx.send(embed=embed)  
      
    dados['farms'][guild_id].append(local)  
    salvar_dados(dados, 'farms')  
      
    embed = discord.Embed(  
        title="✅ Farm Adicionado",  
        description=f"Local de farm '{local}' adicionado com sucesso!",  
        color=0x00FF00  
    )  
    await ctx.send(embed=embed)  
  
elif acao == "remove" and local:  
    if guild_id not in dados.get('farms', {}):  
        embed = discord.Embed(  
            title="⚠️ Nenhum Farm Registrado",  
            description="Não há locais de farm para remover!",  
            color=0xFFA500  
        )  
        return await ctx.send(embed=embed)  
      
    if local not in dados['farms'][guild_id]:  
        embed = discord.Embed(  
            title="⚠️ Farm Não Encontrado",  
            description="Este local de farm não está registrado!",  
            color=0xFFA500  
        )  
        return await ctx.send(embed=embed)  
      
    dados['farms'][guild_id].remove(local)  
    salvar_dados(dados, 'farms')  
      
    embed = discord.Embed(  
        title="✅ Farm Removido",  
        description=f"Local de farm '{local}' removido com sucesso!",  
        color=0x00FF00  
    )  
    await ctx.send(embed=embed)  
  
elif acao == "list":  
    if guild_id not in dados.get('farms', {}) or not dados['farms'][guild_id]:  
        embed = discord.Embed(  
            title="🌾 Locais de Farm",  
            description="Nenhum local de farm registrado ainda!",  
            color=0x32CD32  
        )  
        return await ctx.send(embed=embed)  
      
    embed = discord.Embed(  
        title="🌾 Locais de Farm Registrados",  
        description="\n".join(f"• {farm}" for farm in dados['farms'][guild_id]),  
        color=0x32CD32  
    )  
    embed.set_footer(text=f"Total: {len(dados['farms'][guild_id])} locais")  
    await ctx.send(embed=embed)

======================

SISTEMA DE SOLICITAR CARGO

======================

@bot.hybrid_command(name="solicitarcargo", description="Solicitar um cargo no servidor")
async def solicitarcargo(ctx, cargo: str):
guild_id = str(ctx.guild.id)
user_id = str(ctx.author.id)

if 'solicitacoes' not in dados:  
    dados['solicitacoes'] = {}  
  
if guild_id not in dados['solicitacoes']:  
    dados['solicitacoes'][guild_id] = {}  
  
# Verifica se já tem uma solicitação pendente  
if user_id in dados['solicitacoes'][guild_id]:  
    embed = discord.Embed(  
        title="⚠️ Solicitação Pendente",  
        description="Você já tem uma solicitação de cargo em análise!",  
        color=0xFFA500  
    )  
    return await ctx.send(embed=embed, ephemeral=True)  
  
dados['solicitacoes'][guild_id][user_id] = {  
    "cargo": cargo,  
    "data": datetime.datetime.now().isoformat(),  
    "status": "pendente"  
}  
salvar_dados(dados, 'solicitacoes')  
  
embed = discord.Embed(  
    title="✅ Solicitação Enviada",  
    description=f"Sua solicitação para o cargo '{cargo}' foi enviada com sucesso!",  
    color=0x00FF00  
)  
embed.set_footer(text="A equipe de staff irá analisar sua solicitação")  
await ctx.send(embed=embed, ephemeral=True)  
  
# Envia para o canal de logs se configurado  
if guild_id in dados['logs']:  
    canal_logs = ctx.guild.get_channel(int(dados['logs'][guild_id]['canal_id']))  
    if canal_logs:  
        embed_log = discord.Embed(  
            title="📄 Nova Solicitação de Cargo",  
            description=f"**Usuário:** {ctx.author.mention}\n**Cargo Solicitado:** {cargo}",  
            color=0x7289DA  
        )  
        embed_log.set_footer(text=f"ID: {user_id}")  
          
        view = View()  
        aceitar_btn = Button(label="Aceitar", style=discord.ButtonStyle.green)  
        recusar_btn = Button(label="Recusar", style=discord.ButtonStyle.red)  
          
        async def aceitar_callback(interaction):  
            dados['solicitacoes'][guild_id][user_id]['status'] = "aprovado"  
            dados['solicitacoes'][guild_id][user_id]['moderador'] = str(interaction.user.id)  
            salvar_dados(dados, 'solicitacoes')  
              
            # Aqui você pode adicionar lógica para realmente dar o cargo  
            embed = discord.Embed(  
                title="✅ Solicitação Aprovada",  
                description=f"A solicitação de cargo de {ctx.author.mention} foi aprovada por {interaction.user.mention}",  
                color=0x00FF00  
            )  
            await interaction.response.edit_message(embed=embed, view=None)  
              
            # Notifica o usuário  
            try:  
                await ctx.author.send(f"Sua solicitação para o cargo '{cargo}' foi aprovada!")  
            except:  
                pass  
          
        async def recusar_callback(interaction):  
            dados['solicitacoes'][guild_id][user_id]['status'] = "recusado"  
            dados['solicitacoes'][guild_id][user_id]['moderador'] = str(interaction.user.id)  
            salvar_dados(dados, 'solicitacoes')  
              
            embed = discord.Embed(  
                title="❌ Solicitação Recusada",  
                description=f"A solicitação de cargo de {ctx.author.mention} foi recusada por {interaction.user.mention}",  
                color=0xFF0000  
            )  
            await interaction.response.edit_message(embed=embed, view=None)  
              
            # Notifica o usuário  
            try:  
                await ctx.author.send(f"Sua solicitação para o cargo '{cargo}' foi recusada.")  
            except:  
                pass  
          
        aceitar_btn.callback = aceitar_callback  
        recusar_btn.callback = recusar_callback  
        view.add_item(aceitar_btn)  
        view.add_item(recusar_btn)  
          
        await canal_logs.send(embed=embed_log, view=view)

======================

SISTEMA DE SUGESTÕES

======================

@bot.hybrid_command(name="sugerir", description="Enviar uma sugestão para o servidor")
async def sugerir(ctx, *, sugestao: str):
guild_id = str(ctx.guild.id)

if guild_id not in dados['sugestoes']:  
    embed = discord.Embed(  
        title="⚠️ Sistema Não Configurado",  
        description="O sistema de sugestões não está configurado neste servidor!",  
        color=0xFFA500  
    )  
    return await ctx.send(embed=embed, ephemeral=True)  
  
canal_id = dados['sugestoes'][guild_id]['canal_id']  
canal = ctx.guild.get_channel(int(canal_id))  
  
if not canal:  
    embed = discord.Embed(  
        title="⚠️ Canal Não Encontrado",  
        description="O canal de sugestões não foi encontrado!",  
        color=0xFFA500  
    )  
    return await ctx.send(embed=embed, ephemeral=True)  
  
embed = discord.Embed(  
    title="💡 Nova Sugestão",  
    description=sugestao,  
    color=0x7289DA  
)  
embed.set_author(name=ctx.author.display_name, icon_url=ctx.author.avatar.url)  
embed.set_footer(text=f"ID: {ctx.author.id}")  
  
msg = await canal.send(embed=embed)  
await msg.add_reaction("👍")  
await msg.add_reaction("👎")  
  
embed = discord.Embed(  
    title="✅ Sugestão Enviada",  
    description="Sua sugestão foi enviada com sucesso para o canal de sugestões!",  
    color=0x00FF00  
)  
await ctx.send(embed=embed, ephemeral=True)

======================

SISTEMA DE EVENTOS

======================

@bot.hybrid_command(name="evento", description="Criar ou gerenciar eventos")
async def evento(ctx, acao: str = None, *, nome: str = None):
if not acao:
embed = discord.Embed(
title="🎉 Sistema de Eventos",
description="""Comandos disponíveis:
/evento criar <nome> - Criar um novo evento
/evento listar - Listar eventos ativos
/evento encerrar <nome> - Encerrar um evento""",
color=0xFFD700
)
return await ctx.send(embed=embed)

guild_id = str(ctx.guild.id)  
  
if acao == "criar" and nome:  
    if 'eventos' not in dados:  
        dados['eventos'] = {}  
      
    if guild_id not in dados['eventos']:  
        dados['eventos'][guild_id] = {}  
      
    if nome in dados['eventos'][guild_id]:  
        embed = discord.Embed(  
            title="⚠️ Evento Existente",  
            description="Já existe um evento com este nome!",  
            color=0xFFA500  
        )  
        return await ctx.send(embed=embed)  
      
    dados['eventos'][guild_id][nome] = {  
        "criador": str(ctx.author.id),  
        "data": datetime.datetime.now().isoformat(),  
        "participantes": []  
    }  
    salvar_dados(dados, 'eventos')  
      
    embed = discord.Embed(  
        title="🎉 Evento Criado",  
        description=f"Evento '{nome}' criado com sucesso!",  
        color=0xFFD700  
    )  
    embed.set_footer(text=f"Criado por {ctx.author.display_name}")  
    await ctx.send(embed=embed)  
  
elif acao == "listar":  
    if guild_id not in dados.get('eventos', {}) or not dados['eventos'][guild_id]:  
        embed = discord.Embed(  
            title="🎉 Eventos Ativos",  
            description="Não há eventos ativos no momento!",  
            color=0xFFD700  
        )  
        return await ctx.send(embed=embed)  
      
    embed = discord.Embed(  
        title="🎉 Eventos Ativos",  
        description="\n".join(f"• {evento}" for evento in dados['eventos'][guild_id].keys()),  
        color=0xFFD700  
    )  
    embed.set_footer(text=f"Total: {len(dados['eventos'][guild_id])} eventos")  
    await ctx.send(embed=embed)  
  
elif acao == "encerrar" and nome:  
    if guild_id not in dados.get('eventos', {}) or nome not in dados['eventos'][guild_id]:  
        embed = discord.Embed(  
            title="⚠️ Evento Não Encontrado",  
            description="Não foi encontrado um evento com este nome!",  
            color=0xFFA500  
        )  
        return await ctx.send(embed=embed)  
      
    participantes = len(dados['eventos'][guild_id][nome]['participantes'])  
    del dados['eventos'][guild_id][nome]  
    salvar_dados(dados, 'eventos')  
      
    embed = discord.Embed(  
        title="🎉 Evento Encerrado",  
        description=f"O evento '{nome}' foi encerrado com {participantes} participantes!",  
        color=0xFFD700  
    )  
    await ctx.send(embed=embed)

======================

SISTEMA DE ANÚNCIOS

======================

@bot.hybrid_command(name="anunciar", description="Criar um anúncio no servidor")
@commands.has_permissions(manage_messages=True)
async def anunciar(ctx, canal: discord.TextChannel, *, mensagem: str):
guild_id = str(ctx.guild.id)

if 'anuncios' not in dados:  
    dados['anuncios'] = {}  
  
if guild_id not in dados['anuncios']:  
    dados['anuncios'][guild_id] = []  
  
embed = discord.Embed(  
    title="📢 Anúncio Importante",  
    description=mensagem,  
    color=0xFFD700  
)  
embed.set_footer(text=f"Anúncio feito por {ctx.author.display_name}")  
  
msg = await canal.send(embed=embed)  
await msg.add_reaction("✅")  
  
dados['anuncios'][guild_id].append({  
    "canal": str(canal.id),  
    "mensagem": str(msg.id),  
    "autor": str(ctx.author.id),  
    "data": datetime.datetime.now().isoformat()  
})  
salvar_dados(dados, 'anuncios')  
  
embed = discord.Embed(  
    title="✅ Anúncio Publicado",  
    description=f"Seu anúncio foi publicado em {canal.mention}!",  
    color=0x00FF00  
)  
await ctx.send(embed=embed, ephemeral=True)

======================

EVENTOS DO BOT

======================

@bot.event
async def on_ready():
print(f'✅ Bot online como {bot.user}')
await bot.change_presence(activity=discord.Game(name="/ajuda"))

try:  
    await bot.tree.sync()  
    print("🔁 Comandos slash sincronizados!")  
except Exception as e:  
    print(f"❌ Erro ao sincronizar comandos: {e}")

@bot.event
async def on_member_join(member):
guild_id = str(member.guild.id)

# Cargos automáticos  
if guild_id in dados.get('cargos', {}):  
    cargos = []  
    if dados['cargos'][guild_id]['membro']:  
        cargo = member.guild.get_role(int(dados['cargos'][guild_id]['membro']))  
        if cargo:  
            cargos.append(cargo)  
      
    if cargos:  
        await member.add_roles(*cargos, reason="Cargo automático")  
  
# Mensagem de boas-vindas  
if guild_id in dados.get('boas_vindas', {}):  
    canal = member.guild.get_channel(int(dados['boas_vindas'][guild_id]['canal_id']))  
    if canal:  
        mensagem = dados['boas_vindas'][guild_id]['mensagem']  
        mensagem = mensagem.replace("{membro}", member.mention)  
        mensagem = mensagem.replace("{servidor}", member.guild.name)  
        await canal.send(mensagem)

@bot.event
async def on_command_error(ctx, error):
if isinstance(error, commands.CommandNotFound):
embed = discord.Embed(
title="❌ Comando Não Encontrado",
description="Use /ajuda para ver todos os comandos disponíveis.",
color=0xFF0000
)
await ctx.send(embed=embed, ephemeral=True)
elif isinstance(error, commands.MissingPermissions):
embed = discord.Embed(
title="❌ Permissão Negada",
description="Você não tem permissão para usar este comando!",
color=0xFF0000
)
await ctx.send(embed=embed, ephemeral=True)
else:
embed = discord.Embed(
title="❌ Erro no Comando",
description=f"Ocorreu um erro: {str(error)}",
color=0xFF0000
)
await ctx.send(embed=embed, ephemeral=True)

# Log do erro  
    guild_id = str(ctx.guild.id)  
    if guild_id in dados.get('logs', {}):  
        canal = ctx.guild.get_channel(int(dados['logs'][guild_id]['canal_id']))  
        if canal:  
            embed = discord.Embed(  
                title="⚠️ Erro no Comando",  
                description=f"**Comando:** `{ctx.command}`\n**Usuário:** {ctx.author.mention}\n**Erro:** {str(error)}",  
                color=0xFFA500  
            )  
            await canal.send(embed=embed)

======================

INICIALIZAÇÃO

======================

if name == "main":
bot.run(TOKEN)

 