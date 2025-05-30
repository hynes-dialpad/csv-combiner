"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Download, X, FileText, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "@/components/theme-toggle"

interface UploadedFile {
  file: File
  id: string
  rows: number
  columns: string[]
  data: any[]
}

export default function CSVCombiner() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [combinedData, setCombinedData] = useState<any[]>([])
  const [error, setError] = useState<string>("")

  const parseCSV = (text: string): Promise<any[]> => {
    return new Promise((resolve) => {
      // Simple CSV parser - handles quoted fields and commas within quotes
      const lines = text.split("\n").filter((line) => line.trim())
      if (lines.length === 0) {
        resolve([])
        return
      }

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ""
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === "," && !inQuotes) {
            result.push(current.trim())
            current = ""
          } else {
            current += char
          }
        }

        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0]).map((h) => h.replace(/"/g, ""))
      const data = lines.slice(1).map((line) => {
        const values = parseCSVLine(line).map((v) => v.replace(/"/g, ""))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        return row
      })
      resolve(data)
    })
  }

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (files.length + uploadedFiles.length > 100) {
        setError("Maximum 100 files allowed")
        return
      }

      setIsProcessing(true)
      setError("")
      const newFiles: UploadedFile[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (!file.name.toLowerCase().endsWith(".csv")) {
          setError(`File ${file.name} is not a CSV file`)
          continue
        }

        try {
          const text = await file.text()
          const data = await parseCSV(text)
          const columns = data.length > 0 ? Object.keys(data[0]) : []

          newFiles.push({
            file,
            id: Math.random().toString(36).substr(2, 9),
            rows: data.length,
            columns,
            data,
          })

          setProcessingProgress(((i + 1) / files.length) * 100)
        } catch (err) {
          setError(`Error processing ${file.name}: ${err}`)
        }
      }

      setUploadedFiles((prev) => [...prev, ...newFiles])
      setIsProcessing(false)
      setProcessingProgress(0)
    },
    [uploadedFiles.length],
  )

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
    setCombinedData([])
  }

  const combineCSVs = () => {
    if (uploadedFiles.length === 0) return

    // Get all unique columns
    const allColumns = new Set<string>()
    uploadedFiles.forEach((file) => {
      file.columns.forEach((col) => allColumns.add(col))
    })

    const columnArray = Array.from(allColumns)
    const combined: any[] = []

    // Combine all data
    uploadedFiles.forEach((file) => {
      file.data.forEach((row) => {
        const newRow: any = {}
        columnArray.forEach((col) => {
          newRow[col] = row[col] || ""
        })
        combined.push(newRow)
      })
    })

    setCombinedData(combined)
  }

  const downloadCombinedCSV = () => {
    if (combinedData.length === 0) return

    const columns = Object.keys(combinedData[0])
    const csvContent = [
      columns.join(","),
      ...combinedData.map((row) =>
        columns
          .map((col) => {
            const value = row[col] || ""
            // Escape quotes and wrap in quotes if contains comma or quote
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "combined-data.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearAllFiles = () => {
    setUploadedFiles([])
    setCombinedData([])
    setError("")
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileUpload(files)
      }
    },
    [handleFileUpload],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const totalRows = uploadedFiles.reduce((sum, file) => sum + file.rows, 0)

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            CSV Combiner
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Upload multiple CSV files and combine them into one downloadable file
          </p>
          <p className="text-sm text-muted-foreground mt-1">Supports up to 100 files with automatic column matching</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Upload CSV Files
              {uploadedFiles.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllFiles}>
                  Clear All
                </Button>
              )}
            </CardTitle>
            <CardDescription>Drag and drop your CSV files here or click to browse (max 100 files)</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer bg-muted/10 hover:bg-muted/20"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-medium mb-2">Drop CSV files here</p>
              <p className="text-muted-foreground mb-4">or click to browse your files</p>
              <Button variant="outline">Choose Files</Button>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </div>

            {isProcessing && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Processing files...</span>
                  <span className="text-sm text-muted-foreground">{Math.round(processingProgress)}%</span>
                </div>
                <Progress value={processingProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Uploaded Files ({uploadedFiles.length})</span>
                <div className="flex gap-2">
                  <Badge variant="secondary">{totalRows} total rows</Badge>
                  <Badge variant="outline">
                    {new Set(uploadedFiles.flatMap((f) => f.columns)).size} unique columns
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="font-medium">{file.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {file.rows.toLocaleString()} rows • {file.columns.length} columns
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{(file.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-3 mt-6">
                <Button onClick={combineCSVs} className="flex-1" size="lg">
                  <FileText className="h-4 w-4 mr-2" />
                  Combine CSV Files
                </Button>
                {combinedData.length > 0 && (
                  <Button onClick={downloadCombinedCSV} variant="outline" size="lg">
                    <Download className="h-4 w-4 mr-2" />
                    Download Combined CSV ({combinedData.length.toLocaleString()} rows)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {combinedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Combined Data Preview</CardTitle>
              <CardDescription>
                Showing first 10 rows of {combinedData.length.toLocaleString()} total rows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        {Object.keys(combinedData[0] || {}).map((column) => (
                          <th key={column} className="border border-border p-3 text-left font-medium text-sm">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {combinedData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-muted/50">
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td key={cellIndex} className="border border-border p-3 text-sm max-w-xs truncate">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/20">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>Built with Next.js • Supports CSV files with different column structures</p>
              <p className="mt-1">Files are processed locally in your browser for privacy</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
