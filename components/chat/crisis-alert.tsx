"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Phone, MessageSquare } from "lucide-react"

interface CrisisAlertProps {
  onDismiss?: () => void
}

export function CrisisAlert({ onDismiss }: CrisisAlertProps) {
  return (
    <Alert className="border-red-500/50 bg-red-500/10 mb-4">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-700">Immediate Support Available</AlertTitle>
      <AlertDescription className="text-red-600 space-y-3">
        <p>
          If you're having thoughts of suicide or self-harm, please reach out for immediate help. You're not alone, and
          support is available 24/7.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-red-500 text-red-700 hover:bg-red-50 bg-transparent"
            onClick={() => window.open("tel:988", "_self")}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call 988
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-red-500 text-red-700 hover:bg-red-50 bg-transparent"
            onClick={() => window.open("sms:741741?body=HOME", "_self")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Text HOME to 741741
          </Button>
        </div>

        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} className="text-red-600 hover:text-red-700">
            I understand
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
