<script lang="ts">
  type Props = {
    label: string
    percentage: number
    isLie: boolean
  }

  const { label, percentage, isLie }: Props = $props()

  const barColor = $derived(isLie ? 'bg-red-500' : 'bg-emerald-500')
  const textColor = $derived(isLie ? 'text-red-400' : 'text-emerald-400')
</script>

<div class="flex flex-col gap-1">
  <div class="flex items-center justify-between text-xs">
    <span class={`font-medium ${textColor}`}>{label}</span>
    <span class="text-neutral-400">{percentage}%</span>
  </div>
  <div class="h-2.5 w-full overflow-hidden rounded-full bg-neutral-700">
    <div
      class={`h-full rounded-full transition-all duration-500 ${barColor}`}
      style="width: {percentage}%"
    ></div>
  </div>
</div>
