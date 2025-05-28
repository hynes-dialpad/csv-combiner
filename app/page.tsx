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
      // Simple CSV parser - in production, you'd want to use a library like Papa Parse
      const lines = text.split("\n").filter((line) => line.trim())
      if (lines.length === 0) {
        resolve([])
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const data = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
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
      ...combinedData.map((row) => columns.map((col) => `"${row[col] || ""}"`).join(",")),
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">CSV Combiner</h1>
          <p className="text-muted-foreground mt-2">
            Upload multiple CSV files and combine them into one downloadable file
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV Files</CardTitle>
            <CardDescription>Drag and drop your CSV files here or click to browse (max 100 files)</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drop CSV files here</p>
              <p className="text-sm text-muted-foreground">or click to browse your files</p>
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
              <div className="mt-4">
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
                Uploaded Files ({uploadedFiles.length})<Badge variant="secondary">{totalRows} total rows</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{file.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {file.rows} rows, {file.columns.length} columns
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-3 mt-4">
                <Button onClick={combineCSVs} className="flex-1">
                  Combine CSV Files
                </Button>
                {combinedData.length > 0 && (
                  <Button onClick={downloadCombinedCSV} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Combined CSV ({combinedData.length} rows)
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
              <CardDescription>Showing first 5 rows of {combinedData.length} total rows</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        {Object.keys(combinedData[0] || {}).map((column) => (
                          <th key={column} className="border border-border p-2 text-left font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {combinedData.slice(0, 5).map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td key={cellIndex} className="border border-border p-2 text-sm">
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
      </div>
    </div>
  )
}
