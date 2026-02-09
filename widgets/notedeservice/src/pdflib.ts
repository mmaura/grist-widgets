import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
//const fontkit = () => import('@pdf-lib/fontkit')
// NOTE: Les types global-types.js ne sont pas définis ici, mais sont nécessaires pour l'exécution.
// Je les laisse pour la complétude.
import { DATA, MarkdownFonts, MarkdownFontsBuffer, Rect } from './types.js'
import { ShowMessage } from './utils.js'

// ----------------------------------------------------------------------
// Fonctions UTILITAIRES DE BASE
// ----------------------------------------------------------------------

const NDSDate = (ndsDate: Date) => {
  const date = new Date(ndsDate)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * UTILITAIRE : Divise une chaîne de texte en lignes pour qu'elles rentrent dans la largeur max,
 * tout en respectant les sauts de ligne (\n) existants.
 */
function splitTextIntoLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const finalLines: string[] = []

  // Diviser le texte par les sauts de ligne (\n) pour respecter la mise en forme initiale
  const segments = text.split('\n')

  segments.forEach((segment) => {
    const words = segment.split(' ')
    let currentLine = ''

    for (let i = 0; i < words.length; i++) {
      const word = words[i]

      // Ignorer les mots vides
      if (word.length === 0 && currentLine.length === 0) continue

      const proposedLine =
        currentLine.length === 0 ? word : `${currentLine} ${word}`
      const proposedWidth = font.widthOfTextAtSize(proposedLine, size)

      if (proposedWidth <= maxWidth) {
        // La ligne proposée rentre dans la largeur
        currentLine = proposedLine
      } else {
        // La ligne proposée est trop longue, on commence une nouvelle ligne
        if (currentLine.length > 0) {
          finalLines.push(currentLine)
        }

        // Le mot actuel devient le début de la nouvelle ligne
        currentLine = word

        // Cas limite: si le mot lui-même est plus long que la largeur du rectangle
        if (font.widthOfTextAtSize(currentLine, size) > maxWidth) {
          finalLines.push(currentLine)
          currentLine = '' // On vide la ligne et on continue
        }
      }
    }

    // Ajouter la dernière ligne du segment si elle n'est pas vide
    if (currentLine.length > 0) {
      finalLines.push(currentLine)
    }
  })

  return finalLines
}

/**
 * UTILITAIRE : Dessine une ligne de texte en gérant le formatage inline (gras: **texte**, italique: *texte* ou ***gras-italique***).
 */
function drawFormattedLine(
  page: PDFPage,
  fonts: MarkdownFonts,
  text: string,
  x: number,
  y: number,
  size: number,
): void {
  let currentX = x

  // Expression régulière pour trouver les marqueurs: ***...***, **...**, ou *...*
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g
  const parts = text.split(regex).filter((p) => p.length > 0)

  parts.forEach((part) => {
    let fontToUse = fonts.regular
    let textToDraw = part

    // Détection du Gras-Italique (***)
    if (part.startsWith('***') && part.endsWith('***')) {
      fontToUse = fonts.boldItalic
      textToDraw = part.slice(3, -3)
    }
    // Détection du Gras (**)
    else if (part.startsWith('**') && part.endsWith('**')) {
      fontToUse = fonts.bold
      textToDraw = part.slice(2, -2)
    }
    // Détection de l'Italique (*)
    else if (part.startsWith('*') && part.endsWith('*')) {
      fontToUse = fonts.italic
      textToDraw = part.slice(1, -1)
    }

    const partWidth = fontToUse.widthOfTextAtSize(textToDraw, size)

    page.drawText(textToDraw, {
      x: currentX,
      y: y,
      size: size,
      font: fontToUse,
      color: rgb(0, 0, 0),
    })

    currentX += partWidth
  })
}

/**
 * Fonction pour créer une nouvelle page à partir d'un modèle préchargé.
 */
const NdsNewPage = async (
  pdfDoc: PDFDocument,
  templateDoc: PDFDocument,
  rectCorps: Rect,
): Promise<{ page: PDFPage; rectCorps: Rect }> => {
  const [Page] = await pdfDoc.copyPages(templateDoc, [0])
  const page = pdfDoc.addPage(Page)

  // Ces coordonnées sont spécifiques au modèle de page (M1-PageX.pdf)

  if (__DEBUG__)
    page.drawRectangle({
      x: rectCorps.x,
      y: rectCorps.y,
      width: rectCorps.width,
      height: rectCorps.height,
      borderColor: rgb(1, 0, 0),
      borderWidth: 1,
      opacity: 1,
    })

  return { page, rectCorps }
}

// ----------------------------------------------------------------------
// Fonctions de DESSIN AVANCÉES
// ----------------------------------------------------------------------

/**
 * Dessine et ajuste l'Objet de la note dans un rectangle (fit-to-box).
 */
const drawNdsObjet = (
  page: PDFPage,
  font: PDFFont,
  objet: string,
  bounds: Rect,
): void => {
  const maxLineHeight = 1.2 // Espacement de ligne (1.2x la taille de la police)
  let currentSize = 40 // Taille de police de départ
  const minSize = 2 // Taille minimale autorisée pour la police

  let lines: string[] = []
  let totalHeight: number = Infinity

  // Boucle d'ajustement de la taille de la police
  while (totalHeight > bounds.height && currentSize >= minSize) {
    // 1. Diviser le texte avec la taille de police actuelle
    lines = splitTextIntoLines(objet, font, currentSize, bounds.width)

    // 2. Calculer la hauteur totale nécessaire pour toutes les lignes
    totalHeight = lines.length * currentSize * maxLineHeight

    // Si la hauteur est trop grande, réduire la taille de la police
    if (totalHeight > bounds.height) {
      currentSize -= 1
    }
  }

  // Avertissement si le texte ne rentre toujours pas
  if (totalHeight > bounds.height && currentSize === minSize) {
    console.warn(
      `Le texte de l'objet ne rentre pas même à la taille minimale (${minSize}). Il sera coupé ou dépassera.`,
    )
  }

  // --- Dessin du Texte ---

  // Position Y de départ (en haut du rectangle, ajustée pour la ligne de base)
  let currentY = bounds.y + bounds.height - currentSize
  const lineHeight = currentSize * maxLineHeight

  lines.forEach((line) => {
    // Calcul de l'alignement au centre par rapport à la largeur du rectangle
    const lineWidth = font.widthOfTextAtSize(line, currentSize)
    const xPosition = bounds.x + bounds.width / 2 - lineWidth / 2

    page.drawText(line, {
      x: xPosition,
      y: currentY,
      size: currentSize,
      font: font,
    })

    // Décaler Y pour la ligne suivante (descendre sur la page)
    currentY -= lineHeight
  })
}

/**
 * Dessine le corps du document à partir du Markdown, gère le wrapping, le formatage et le saut de page.
 * CORRECTION MAJEURE: Implémentation de la pagination ligne par ligne pour éviter les boucles infinies.
 * AMÉLIORATION: Ajout de la gestion des sous-puces et du retrait de texte par deux espaces ou tabulation.
 * NOUVEAU: Le retrait pour les paragraphes simples n'affecte que la première ligne, et le wrapping est corrigé.
 */
const drawMarkdownBody = async (
  pdfDoc: PDFDocument,
  page: PDFPage,
  templateDoc: PDFDocument,
  fonts: MarkdownFonts,
  markdownContent: string,
  bounds: Rect,
  initialY: number,
  fontSize: number,
): Promise<{ currentPage: PDFPage; currentY: number }> => {
  let currentPage = page
  let currentY = initialY
  let currentBounds = bounds
  const paragraphSpacing = 1.5
  const baseIndent = 20 // Indentation de base pour les listes et les retraits de paragraphe
  const lineHeight = fontSize * 1.2
  const spacingHeight = paragraphSpacing * fontSize

  // Séparer le contenu en blocs (paragraphes, listes) par double saut de ligne
  const paragraphs = markdownContent
    .split(/\n\n+/)
    .filter((b) => b.trim().length > 0)

  // Itérer sur chaque bloc de contenu (paragraphe, élément de liste)
  for (const paragraph of paragraphs) {
    let indentLevel = 0

    // Compter les niveaux d'indentation (1 niveau = 2 espaces ou 1 tabulation)
    // Nous devons travailler avec une copie de la chaîne pour retirer l'indentation
    let tmpParagraph = paragraph
    while (tmpParagraph.startsWith('\t') || tmpParagraph.startsWith('  ')) {
      if (tmpParagraph.startsWith('\t')) {
        tmpParagraph = tmpParagraph.substring(1)
        indentLevel++
      } else if (tmpParagraph.startsWith('  ')) {
        tmpParagraph = tmpParagraph.substring(2)
        indentLevel++
      } else {
        break
      }
    }

    const currentIndentOffset = indentLevel * baseIndent

    // Détection de Liste Non Ordonnée (démarre par '-' ou '*')
    const isListItem =
      tmpParagraph.trimStart().startsWith('- ') ||
      tmpParagraph.trimStart().startsWith('* ')

    // Retirer le marqueur de liste si présent
    const textToWrap = isListItem
      ? tmpParagraph.trimStart().substring(2)
      : tmpParagraph.trimStart()

    const fontToUse = fonts.regular

    let availableWidth = currentBounds.width
    let baseTextXOffset = 0 // La position X des lignes qui ne sont PAS la première (lignes suivantes du paragraphe, ou toutes les lignes d'une liste)

    if (isListItem) {
      // Pour les listes, l'indentation s'applique à TOUTES les lignes (listes imbriquées).
      // Le texte commence après l'offset d'indentation ET l'espace de la puce (baseIndent).
      baseTextXOffset = currentIndentOffset + baseIndent
      availableWidth -= baseTextXOffset
    } else if (indentLevel > 0) {
      // Pour les PARAGRAPHES INDENTÉS (retrait de première ligne).
      availableWidth -= currentIndentOffset
      baseTextXOffset = 0 // Les lignes suivantes reviennent au début du bloc (currentBounds.x)
    }

    // 1. Découper le bloc actuel en lignes pour déterminer sa hauteur
    // La largeur disponible est réduite par l'offset calculé ci-dessus, garantissant que le texte ne déborde pas.
    const lines = splitTextIntoLines(
      textToWrap,
      fontToUse,
      fontSize,
      availableWidth,
    )

    // 2. Gestion de l'espacement entre blocs
    // Nous vérifions si l'espacement seul pourrait nous faire passer à une nouvelle page.
    if (lines.length > 0) {
      if (currentY - spacingHeight < currentBounds.y) {
        // Si l'espacement ne rentre pas, nous passons à la nouvelle page SANS dessiner l'espace.
        const { page: newPage, rectCorps: newBounds } = await NdsNewPage(
          pdfDoc,
          templateDoc,
          bounds,
        )

        currentPage = newPage
        currentBounds = newBounds
        currentY = currentBounds.y + currentBounds.height // Y est réinitialisé en haut
        // Le spacing n'est pas appliqué, la nouvelle ligne débutera directement en haut de page.
      } else {
        // L'espacement rentre, nous l'appliquons avant de dessiner les lignes du bloc.
        currentY -= spacingHeight
      }
    }

    // 3. Dessin Ligne par Ligne (avec vérification de saut de page pour chaque ligne)
    let isFirstLineOfBlock = true
    for (const line of lines) {
      // 3.1 Déterminer la position Y de la ligne, en descendant (currentY - lineHeight)
      let nextY = currentY - lineHeight

      // 3.2 Vérification du Saut de Page pour la ligne actuelle
      if (nextY < currentBounds.y) {
        // New page needed
        const { page: newPage, rectCorps: newBounds } = await NdsNewPage(
          pdfDoc,
          templateDoc,
          bounds,
        )

        currentPage = newPage
        currentBounds = newBounds
        currentY = currentBounds.y + currentBounds.height // Reset Y to top

        // Recalculer nextY sur la nouvelle page
        nextY = currentY - lineHeight
      }

      // 3.3 Déterminer la position X de départ de la ligne
      let xPosition = currentBounds.x + baseTextXOffset // Position de base pour les lignes suivantes (0 si paragraphe, ou offset complet si liste)

      if (isFirstLineOfBlock) {
        // Si c'est la première ligne du bloc, nous gérons le retrait:
        if (isListItem) {
          // Pour une LISTE: on place la puce à l'offset d'indentation, et le texte à l'offset de baseTextXOffset
          currentPage.drawText('•', {
            x: currentBounds.x + currentIndentOffset, // Puce start is indented
            y: nextY,
            size: fontSize,
            font: fonts.bold,
          })
          // xPosition est déjà correct (currentBounds.x + baseTextXOffset)
        } else if (indentLevel > 0) {
          // Pour un PARAGRAPHE indenté: on décale UNIQUEMENT la première ligne.
          xPosition = currentBounds.x + currentIndentOffset
        } else {
          // Paragraphe non indenté
          xPosition = currentBounds.x
        }
      }

      isFirstLineOfBlock = false // La première ligne est passée

      // 3.4 Mettre à jour currentY et dessiner la ligne
      currentY = nextY // Mettre à jour la position Y
      drawFormattedLine(currentPage, fonts, line, xPosition, currentY, fontSize)
    }

    // Après le dernier bloc, le paragraphSpacing n'est pas ajouté, car il a été géré au DÉBUT de l'itération suivante.
  }

  return { currentPage, currentY } // Retourne la position Y finale
}

async function drawSignature(
  pdfDoc: PDFDocument,
  page: PDFPage,
  signature: string,
  bounds: Rect,
  initialY: number,
): Promise<boolean> {
  try {
    const imageArrayBuffer = await fetch(signature).then((res) =>
      res.arrayBuffer(),
    )

    const uint8Array = new Uint8Array(imageArrayBuffer)

    // JPEG : Commence par 0xFF, 0xD8, 0xFF
    const isJpg =
      uint8Array[0] === 0xff && uint8Array[1] === 0xd8 && uint8Array[2] === 0xff

    // PNG : Commence par 0x89, 0x50, 0x4E, 0x47
    const isPng =
      uint8Array[0] === 0x89 &&
      uint8Array[1] === 0x50 &&
      uint8Array[2] === 0x4e &&
      uint8Array[3] === 0x47

    let image

    if (isJpg) {
      // Utiliser la méthode d'incorporation JPEG
      image = await pdfDoc.embedJpg(imageArrayBuffer)
      console.log('Format détecté : JPEG')
    } else if (isPng) {
      // Utiliser la méthode d'incorporation PNG
      image = await pdfDoc.embedPng(imageArrayBuffer)
      console.log('Format détecté : PNG')
    } else {
      // Gérer les formats non pris en charge ou non reconnus (par exemple, des erreurs)
      throw new Error(
        "Format d'image non pris en charge (doit être JPG ou PNG).",
      )
    }

    const scale = bounds.height / image.height

    const imgDims = image.scale(scale)

    page.drawImage(image, {
      x: bounds.x - imgDims.width / 2,
      y: initialY - imgDims.height - 10,
      width: imgDims.width,
      height: imgDims.height,
      // rotate: degrees(30),
      // opacity: 0.75,
    })
  } catch (e) {
    ShowMessage(
      "Impossible d'inserer la signature:",
      e,
      'signature: ',
      signature,
    )
  }
  return true
}

// ----------------------------------------------------------------------
// Fonctions de CHARGEMENT des RESSOURCES et PRINCIPALE
// ----------------------------------------------------------------------

// Interface pour les ressources préchargées
export interface PdfResources {
  fonts: MarkdownFontsBuffer
  firstPageTemplate: PDFDocument
  otherPagesTemplate: PDFDocument
}

/**
 * OPTIMISATION MAJEURE: Charge toutes les ressources asynchrones une seule fois.
 * NOTE IMPORTANTE: CORRECTION POTENTIELLE de typo de chemin pour les polices italic/boldItalic.
 */
export async function loadPdfResources(): Promise<PdfResources> {
  const pdfDoc = await PDFDocument.create()

  const [
    arialFontBytes,
    arialBoldFontBytes,
    arialItalicFontBytes,
    arialBoldItalicFontBytes,
    firstDonorPdfBytes,
    otherDonorPdfBytes,
  ] = await Promise.all([
    fetch(`${__BASE__}fonts/ArialMT.ttf`).then((res) => res.arrayBuffer()),
    fetch(`${__BASE__}fonts/Arial-BoldMT.ttf`).then((res) => res.arrayBuffer()),
    // CORRECTION (assumée): doit être le fichier ITALIC
    fetch(`${__BASE__}fonts/Arial-ItalicMT.ttf`).then((res) =>
      res.arrayBuffer(),
    ),
    // CORRECTION (assumée): doit être le fichier BOLD-ITALIC
    fetch(`${__BASE__}fonts/Arial-BoldItalicMT.ttf`).then((res) =>
      res.arrayBuffer(),
    ),
    fetch(`${__BASE__}pages/M1-Page1.pdf`).then((res) => res.arrayBuffer()),
    fetch(`${__BASE__}pages/M1-PageX.pdf`).then((res) => res.arrayBuffer()),
  ])

  if (__DEBUG__) console.log('************ Load Resources ******************')

  pdfDoc.registerFontkit(fontkit)

  // NOTE: Pas besoin d'embed ici, l'embedding se fait dans MakePdf.

  const fonts: MarkdownFontsBuffer = {
    regular: arialFontBytes,
    bold: arialBoldFontBytes,
    italic: arialItalicFontBytes,
    boldItalic: arialBoldItalicFontBytes,
  }

  const firstPageTemplate = await PDFDocument.load(firstDonorPdfBytes)
  const otherPagesTemplate = await PDFDocument.load(otherDonorPdfBytes)

  return {
    fonts,
    firstPageTemplate,
    otherPagesTemplate,
  }
}

/**
 * Fonction principale: Crée le PDF en utilisant les ressources préchargées.
 */
export async function MakePdf(
  data: DATA,
  resources: PdfResources,
): Promise<Uint8Array> {
  if (__DEBUG__) console.log(`data dans make PDF`, data)

  // 1. Créer un NOUVEAU document PDF à chaque exécution
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  // Importer les polices pré-embeddées dans le nouveau document
  const fonts: MarkdownFonts = {
    regular: await pdfDoc.embedFont(resources.fonts.regular),
    bold: await pdfDoc.embedFont(resources.fonts.bold),
    italic: await pdfDoc.embedFont(resources.fonts.italic),
    boldItalic: await pdfDoc.embedFont(resources.fonts.boldItalic),
  }

  /**
   * Intégrer la première page (qui a été préchargée)
   */
  const [firstDonorPage] = await pdfDoc.copyPages(
    resources.firstPageTemplate,
    [0],
  )
  const page1 = pdfDoc.addPage(firstDonorPage)

  /**
   * MÉTA data
   */
  pdfDoc.setTitle(data.objet)
  pdfDoc.setAuthor(data.timbre_suivis)
  pdfDoc.setSubject(data.objet)
  pdfDoc.setKeywords(['SDIS66', 'courrier'])
  pdfDoc.setCreator('pdf-lib (https://github.com/Hopding/pdf-lib)')
  pdfDoc.setCreationDate(new Date())
  pdfDoc.setModificationDate(new Date())

  /**
   * Timbre (Coordonnées du document)
   */
  const regularFont = fonts.regular
  let yPos = 667
  page1.drawText(data.timbre_pole, {
    x: 72,
    y: yPos,
    size: 9,
    font: regularFont,
  })
  page1.drawText(data.timbre_gpt, {
    x: 105,
    y: (yPos -= 12),
    size: 9,
    font: regularFont,
  })
  page1.drawText(data.timbre_srv, {
    x: 85,
    y: (yPos -= 12),
    size: 9,
    font: regularFont,
  })
  page1.drawText(data.timbre_suivis, {
    x: 125,
    y: (yPos -= 12),
    size: 9,
    font: regularFont,
  })
  page1.drawText(data.timbre_tph, {
    x: 65,
    y: (yPos -= 12),
    size: 9,
    font: regularFont,
  })
  page1.drawText(data.timbre_mail, {
    x: 62,
    y: (yPos -= 12),
    size: 9,
    font: regularFont,
  })

  /**
   * Date
   */
  const formatedDate = NDSDate(data.date)

  page1.drawText(`${data.lieu}, le ${formatedDate}`, {
    x: 315,
    y: 792,
    size: 11,
    font: regularFont,
  })

  /**
   * Objet (Zone d'ajustement de texte)
   */
  // NOTE: Ces coordonnées sont spécifiques à la première page
  const rectObjet = {
    x: 55,
    y: 495,
    width: 493,
    height: 85,
  }

  if (__DEBUG__)
    page1.drawRectangle({
      x: rectObjet.x,
      y: rectObjet.y,
      width: rectObjet.width,
      height: rectObjet.height,
      borderColor: rgb(1, 0, 0),
      borderWidth: 1,
      opacity: 0.1,
    })

  drawNdsObjet(page1, fonts.bold, data.objet, rectObjet)

  /**
   * Corps du Document (avec gestion de la pagination)
   */
  const rectCorps = {
    x: 55,
    y: 30,
    width: 493,
    height: 780,
  }

  if (__DEBUG__)
    page1.drawRectangle({
      x: rectCorps.x,
      y: rectCorps.y,
      width: rectCorps.width,
      height: rectCorps.height,
      borderColor: rgb(1, 0, 0),
      borderWidth: 1,
      opacity: 0.1,
    })

  const { currentPage, currentY } = await drawMarkdownBody(
    pdfDoc,
    page1,
    resources.otherPagesTemplate, // Le modèle préchargé pour les pages suivantes
    fonts,
    data.corps,
    rectCorps,
    485, // Position Y de départ sur la première page (sous la zone d'Objet)
    14,
  )

  /**
   * Signature
   */
  const rectSign = {
    x: 400, //point central
    y: 0, // inutile
    width: 0, // innutile
    height: 90,
  }

  if (__DEBUG__) console.log(data.signatureUrl)
  await drawSignature(
    pdfDoc,
    currentPage,
    data.signatureUrl,
    rectSign,
    currentY,
  )

  return pdfDoc.save()
  //return pdfDoc.saveAsBase64({ dataUri: true })
}
