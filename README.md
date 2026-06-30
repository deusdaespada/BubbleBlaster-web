# BubbleBlaster Web

Reescrita do [BubbleBlaster](https://github.com/Aeonss/BubbleBlaster) original
(um app desktop em Python/Tkinter) como uma aplicacao **web em Next.js**,
pronta pra hospedar na Vercel.

## O que mudou em relacao ao app original

O BubbleBlaster original roda no seu computador e usa **EasyOCR + PyTorch**
para o OCR e um modelo de inpainting que pede GPU/CUDA. Isso nao roda em
serverless (Vercel tem limite de tamanho de funcao e de tempo de execucao, e
nao tem GPU disponivel). Por isso a reescrita move tudo pro **navegador**:

| | Original (Python) | Web (este projeto) |
|---|---|---|
| OCR | EasyOCR (PyTorch) | [Tesseract.js](https://github.com/naptha/tesseract.js) (WASM, no navegador) |
| Remover texto | preenchimento branco ou inpaint com GPU (CUDA) | preenchimento branco, ou inpaint TELEA via OpenCV.js (CPU, no navegador) |
| Traducao | `deep-translator` (Google Tradutor) | mesma ideia, via uma rota serverless (`/api/translate`) pra evitar CORS |
| Interface | janela Tkinter | pagina web responsiva |
| Onde roda | seu PC | seu navegador, hospedado na Vercel |
| Historico | nao tinha | opcional, com Supabase |

Nenhuma imagem e enviada pra um servidor de processamento: o OCR e a remocao
de texto rodam 100% no navegador da pessoa. So a traducao (texto, nao
imagem) passa por uma function da Vercel, e o historico (se voce configurar
o Supabase) sobe as imagens pro seu proprio projeto Supabase.

Os arquivos Python originais ficam guardados em `legacy-python/` so de
referencia - eles nao fazem parte do site.

## Funcionalidades

- Importar uma ou varias paginas (PNG/JPG)
- Escolher o idioma do texto (coreano, japones, chines, ingles, russo,
  espanhol, italiano, portugues)
- Ajustar a confianca minima do OCR com um slider (refiltra na hora, sem
  precisar escanear de novo)
- Clicar nos baloes detectados pra selecionar quais apagar
- Apagar so os selecionados ou todos de uma vez
- Dois modos de remocao: preenchimento branco simples, ou inpaint
  inteligente (TELEA, via OpenCV.js)
- Exportar o texto bruto detectado (.txt) e/ou uma traducao (.txt)
- Baixar a imagem processada
- Historico opcional (com login por link magico) guardando as paginas
  processadas no Supabase

## Rodando localmente

Requisitos: Node.js 20+.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem nenhuma configuracao extra, OCR, remocao de
texto, exportacao de texto e traducao ja funcionam. Login e historico ficam
escondidos at voce configurar o Supabase (proxima secao).

## Hospedando na Vercel

1. Suba este projeto pra um repositorio no GitHub/GitLab/Bitbucket.
2. Na [Vercel](https://vercel.com/new), importe o repositorio. O framework
   "Next.js" e detectado automaticamente, nao precisa mudar nada no build.
3. Se for usar o Supabase, adicione as variaveis de ambiente (proxima
   secao) em **Project Settings > Environment Variables** antes do deploy
   (ou redeploy depois de adicionar).
4. Deploy.

Alternativa via CLI:

```bash
npm i -g vercel
vercel
```

## Configurando o Supabase (opcional)

Sem isso o site funciona normalmente - so ficam escondidos o login e o
historico. Se quiser guardar as paginas processadas:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** e rode o conteudo de `supabase/schema.sql` (cria a
   tabela `blasts`, o bucket de Storage `bubbleblaster` e as politicas de
   RLS - cada pessoa so ve e acessa os proprios arquivos).
3. Em **Authentication > Providers**, o provider de Email ja vem habilitado
   (login por email+senha). Se quiser tambem o botao "Continuar com Google",
   habilite o provider Google ali e configure o OAuth client (veja a doc do
   Supabase: Authentication > Providers > Google).
4. Em **Project Settings > API**, copie a "Project URL" e a chave
   "anon public".
5. Configure essas variaveis (no `.env.local` pra dev, e nas Environment
   Variables da Vercel pra producao):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
NEXT_PUBLIC_SUPABASE_BUCKET=bubbleblaster
```

6. **Passo critico** - em **Authentication > URL Configuration**:
   - "Site URL": coloque a URL da sua Vercel (ex: `https://seu-app.vercel.app`)
   - "Redirect URLs": adicione essa mesma URL
   
   Sem isso, qualquer fluxo de auth (reset de senha, confirmacao de email,
   login com Google) redireciona pra um endereco antigo/local e a pagina
   fica com "ERR_CONNECTION_REFUSED" - foi exatamente esse o erro visto
   nos testes iniciais.

## Diagnostico do "Failed to fetch" (resolvido)

Esse erro apareceu de forma intermitente em testes pelo celular: o OCR
funcionava no wifi e as vezes falhava nos dados moveis, mesmo sem nenhum
bloqueador instalado. A causa era a CDN externa (`cdn.jsdelivr.net`) usada
pelo Tesseract.js para baixar o motor (worker + WASM, alguns MB) - em redes
de celular/operadoras instaveis, esse download as vezes falha.

A solucao foi parar de depender de uma CDN externa pra esses arquivos
pesados: agora `scripts/copy-tesseract-assets.js` roda automaticamente
depois do `npm install` (tanto local quanto na Vercel) e copia o worker e
o WASM do Tesseract.js de `node_modules` para `public/tesseract/`. Dali em
diante, o navegador baixa esses arquivos do MESMO dominio do site (servido
pela CDN da Vercel), e so os arquivos de idioma (.traineddata, mais leves)
continuam vindo de fora. Se por algum motivo os arquivos locais nao
existirem (ex: build muito antigo), o codigo cai automaticamente pro CDN
externo como segunda tentativa.

## Limitacoes e observacoes

- **OCR**: Tesseract.js e mais leve que o EasyOCR, mas pode ser um pouco
  menos preciso em alguns idiomas/fontes estilizadas de manga. Os baixa os
  modelos de idioma automaticamente na primeira vez que voce escaneia cada
  idioma (alguns MB, ficam em cache no navegador depois).
- **Inpaint inteligente**: carrega o OpenCV.js (~8MB) direto de um CDN
  oficial (`docs.opencv.org`) so quando voce ativa essa opcao - nao afeta o
  tamanho do site nem o tempo de build. Se o CDN estiver bloqueado na sua
  rede, o app cai automaticamente pro preenchimento branco simples.
- **Traducao**: usa o endpoint publico (nao-oficial) do Google Tradutor,
  igual o `deep-translator` do projeto original fazia. Pode ter limite de
  uso. Pra um volume alto/uso comercial, troque por uma API paga (Google
  Cloud Translation, DeepL, etc.) em `app/api/translate/route.ts`.
- Tudo isso e ajustavel - os arquivos em `lib/` sao pequenos e bem
  separados (`ocr.ts`, `inpaint.ts`, `raw.ts`).

## Estrutura do projeto

```
app/                  paginas (Blaster, login, historico) e a rota /api/translate
components/           Dropzone, fila de imagens, painel de configuracoes, canvas
lib/                  OCR, inpaint, texto bruto, cliente Supabase, historico
supabase/schema.sql   tabela + storage + RLS do Supabase
legacy-python/        app desktop original, mantido so de referencia
```
