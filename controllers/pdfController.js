const Contract = require('../models/contractModel')
const Property = require('../models/propertyModel')
const User = require('../models/usersModel')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')

// Generate a simple signed PDF for a contract
const generateContractPdf = async (req, res) => {
  try {
    const id = req.params.id
    const contract = await Contract.findById(id).populate('property owner renter')
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' })

    // Build a formal, clause-structured representation of the contract for the PDF
    const fmt = (d) => {
      try { return d ? (new Date(d)).toISOString().slice(0,10) : '' } catch (e) { return '' }
    }

    // Helper to ensure we only include safe string values
    const safe = (v, fallback='') => {
      if (v === undefined || v === null) return fallback
      if (typeof v === 'string') return v
      if (typeof v === 'number' || typeof v === 'boolean') return String(v)
      // If it's an object, try common fields
      if (typeof v === 'object') {
        return (v.name || v.fullName || v.username || v.email || v._id) ? String(v.name || v.fullName || v.username || v.email || v._id) : fallback
      }
      return fallback
    }

    const ownerName = safe(contract.owner, 'No name provided')
    const ownerEmail = safe(contract.owner && contract.owner.email, 'No email provided')
    const ownerPhone = safe(contract.owner && (contract.owner.phone || contract.owner.phoneNumber), 'No phone provided')
    const renterName = safe(contract.renter, 'No name provided')
    const renterEmail = safe(contract.renter && contract.renter.email, 'No email provided')
    const renterPhone = safe(contract.renter && (contract.renter.phone || contract.renter.phoneNumber), 'No phone provided')
    const propAddress = safe(contract.property && (contract.property.address || contract.property.name), 'No address provided')
    const propType = safe(contract.property && (contract.property.type || contract.property.propertyType), '')
    const propDesc = safe(contract.property && (contract.property.description || contract.property.name), 'No description provided')

    const lines = []
    lines.push('RENTAL AGREEMENT')
    lines.push('')
    lines.push(`Contract ID: ${contract._id}`)
    lines.push(`Effective Date: ${contract.createdAt ? fmt(contract.createdAt) : fmt(new Date())}`)
    lines.push('')
    lines.push('PARTIES:')
    lines.push(`  Owner / Landlord: ${ownerName}`)
    if (ownerEmail) lines.push(`    Email: ${ownerEmail}`)
    if (ownerPhone) lines.push(`    Phone: ${ownerPhone}`)
    lines.push(`  Tenant / Renter: ${renterName}`)
    if (renterEmail) lines.push(`    Email: ${renterEmail}`)
    if (renterPhone) lines.push(`    Phone: ${renterPhone}`)
    lines.push('')
    lines.push('PROPERTY:')
    lines.push(`  Address: ${propAddress}`)
    if (propType) lines.push(`  Type: ${propType}`)
    if (propDesc) lines.push(`  Description: ${propDesc}`)
    lines.push('')
    lines.push('TERM:')
    lines.push(`  Commencement: ${contract.startDate ? fmt(contract.startDate) : ''}`)
    lines.push(`  Termination: ${contract.endDate ? fmt(contract.endDate) : ''}`)
    if (contract.renewalTerms) lines.push(`  Renewal: ${contract.renewalTerms}`)
    lines.push('')
    lines.push('RENT AND PAYMENT:')
    lines.push(`  Monthly Rent: ${contract.rentAmount || ''} ${contract.currency || ''}`)
    if (contract.dueDay) lines.push(`  Rent Due Day: ${contract.dueDay}`)
    if (contract.lateFee) lines.push(`  Late Fee: ${contract.lateFee}`)
    lines.push(`  Security Deposit: ${contract.securityDeposit || ''} ${contract.currency || ''}`)
    lines.push('')
    lines.push('USE AND MAINTENANCE:')
    lines.push('  Tenant shall use the Property as a residential dwelling and maintain it in good condition.')
    lines.push('')
    lines.push('TERMINATION:')
    lines.push('  Termination and notice provisions are governed by applicable law and this Agreement.')
    lines.push('')
    lines.push('DIGITAL ACCEPTANCE:')
    lines.push('  The parties agree that electronic acceptance via the web application (checkbox with recorded signature name and timestamp) constitutes a valid signature.')
    lines.push('')
    lines.push('SIGNATURES:')
    if (contract.ownerAccepted && contract.ownerAccepted.accepted) {
      lines.push(`  Owner: ${contract.ownerAccepted.signature?.name || ownerName}`)
      if (contract.ownerAccepted.at) lines.push(`    Signed at: ${fmt(contract.ownerAccepted.at)}`)
    } else {
      lines.push('  Owner: (not signed)')
    }
    if (contract.renterAccepted && contract.renterAccepted.accepted) {
      lines.push(`  Renter: ${contract.renterAccepted.signature?.name || renterName}`)
      if (contract.renterAccepted.at) lines.push(`    Signed at: ${fmt(contract.renterAccepted.at)}`)
    } else {
      lines.push('  Renter: (not signed)')
    }
    lines.push('')
    lines.push('This document was generated by the Rentify web application and is a summary of the agreement between the parties.')

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontSize = 11
    const margin = 50
    let y = height - margin

    const wrapLine = (text, maxChars = 90) => {
      if (!text) return ['']
      const parts = []
      let remaining = text
      while (remaining.length > maxChars) {
        let slice = remaining.slice(0, maxChars)
        const lastSpace = slice.lastIndexOf(' ')
        if (lastSpace > 20) slice = remaining.slice(0, lastSpace)
        parts.push(slice.trim())
        remaining = remaining.slice(slice.length).trim()
      }
      if (remaining.length) parts.push(remaining)
      return parts
    }

    const drawLines = (items, opt={}) => {
      const fnt = opt.bold ? boldFont : font
      const size = opt.size || fontSize
      for (const rawLine of items) {
        const wrapped = wrapLine(String(rawLine || ''), 90)
        for (const line of wrapped) {
          if (y < margin + 30) {
            page = pdfDoc.addPage()
            const sizePage = page.getSize()
            y = sizePage.height - margin
          }
          page.drawText(line, { x: margin, y: y, size, font: fnt, color: rgb(0,0,0) })
          y -= size + 6
        }
      }
    }

    // Header
    page.drawText('RENTAL AGREEMENT', { x: margin, y: y, size: 18, font: boldFont, color: rgb(0,0,0) })
    y -= 28

    // Render structured sections with headings
    const headerLines = [
      `Contract ID: ${safe(contract._id, '')}`,
      `Effective Date: ${contract.createdAt ? fmt(contract.createdAt) : fmt(new Date())}`,
      ''
    ]
    drawLines(headerLines)

    drawLines(['PARTIES:'], { bold: true, size: 13 })
    drawLines([`  Owner / Landlord: ${ownerName}`, `    Email: ${ownerEmail}`, `    Phone: ${ownerPhone}`, ''])
    drawLines([`  Tenant / Renter: ${renterName}`, `    Email: ${renterEmail}`, `    Phone: ${renterPhone}`, ''])

    drawLines(['PROPERTY:'], { bold: true, size: 13 })
    drawLines([`  Address: ${propAddress}`, propType ? `  Type: ${propType}` : '', `  Description: ${propDesc}`, ''])

    drawLines(['TERM:'], { bold: true, size: 13 })
    drawLines([`  Commencement: ${contract.startDate ? fmt(contract.startDate) : ''}`, `  Termination: ${contract.endDate ? fmt(contract.endDate) : ''}`, contract.renewalTerms ? `  Renewal: ${contract.renewalTerms}` : '', ''])

    drawLines(['RENT AND PAYMENT:'], { bold: true, size: 13 })
    drawLines([`  Monthly Rent: ${contract.rentAmount || 'TBD'} ${contract.currency || ''}`, contract.dueDay ? `  Rent Due Day: ${contract.dueDay}` : '', contract.lateFee ? `  Late Fee: ${contract.lateFee}` : '', `  Security Deposit: ${contract.securityDeposit || 'TBD'} ${contract.currency || ''}`, ''])

    drawLines(['USE AND MAINTENANCE:'], { bold: true, size: 13 })
    drawLines(['  Tenant shall use the Property as a residential dwelling and maintain it in good condition.', ''])

    drawLines(['TERMINATION:'], { bold: true, size: 13 })
    drawLines(['  Termination and notice provisions are governed by applicable law and this Agreement.', ''])

    drawLines(['DIGITAL ACCEPTANCE:'], { bold: true, size: 13 })
    drawLines(['  Electronic acceptance via the web application (checkbox with recorded signature name and timestamp) constitutes a valid signature.', ''])

    drawLines(['SIGNATURES:'], { bold: true, size: 13 })
    if (contract.ownerAccepted && contract.ownerAccepted.accepted) {
      drawLines([`  Owner: ${safe(contract.ownerAccepted.signature?.name, ownerName)}`])
      if (contract.ownerAccepted.at) drawLines([`    Signed at: ${fmt(contract.ownerAccepted.at)}`])
    } else {
      drawLines(['  Owner: (not signed)'])
    }
    if (contract.renterAccepted && contract.renterAccepted.accepted) {
      drawLines([`  Renter: ${safe(contract.renterAccepted.signature?.name, renterName)}`])
      if (contract.renterAccepted.at) drawLines([`    Signed at: ${fmt(contract.renterAccepted.at)}`])
    } else {
      drawLines(['  Renter: (not signed)'])
    }
    drawLines(['', 'This document was generated by the Rentify web application and is a summary of the agreement between the parties.'])

    const pdfBytes = await pdfDoc.save()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=contract-${id}.pdf`)
    return res.send(Buffer.from(pdfBytes))
  } catch (err) {
    console.error('generateContractPdf', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { generateContractPdf };
