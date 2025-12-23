import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OptionGroup {
  id: string;
  product_id?: string;
  name: string;
  description: string | null;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  selection_type: string;
  sort_order: number;
  created_at?: string;
  options: OptionItem[];
}

interface OptionItem {
  id: string;
  name: string;
  description: string | null;
  price_modifier: number;
  is_required: boolean;
  is_available: boolean;
  sort_order: number;
  group_id: string | null;
}

interface ProductOptionsEditorProps {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

const SELECTION_TYPES = [
  { value: 'single', label: 'Escolha única', description: 'Cliente escolhe apenas uma opção' },
  { value: 'multiple', label: 'Múltipla escolha', description: 'Cliente pode escolher várias opções' },
  { value: 'half_half', label: 'Meio a meio', description: 'Para pizzas: escolher 2 sabores' },
];

export function ProductOptionsEditor({ productId, productName, open, onClose }: ProductOptionsEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group form
  const [groupModal, setGroupModal] = useState<{ open: boolean; group: OptionGroup | null }>({
    open: false,
    group: null,
  });
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    is_required: false,
    min_selections: 0,
    max_selections: 1,
    selection_type: 'single',
  });

  // Option form
  const [optionModal, setOptionModal] = useState<{ open: boolean; groupId: string; option: OptionItem | null }>({
    open: false,
    groupId: '',
    option: null,
  });
  const [optionForm, setOptionForm] = useState({
    name: '',
    description: '',
    price_modifier: '',
  });

  useEffect(() => {
    if (open && productId) {
      loadOptions();
    }
  }, [open, productId]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (groupsError) throw groupsError;

      // Load options for each group
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (optionsError) throw optionsError;

      // Also load ungrouped options (legacy)
      const groupedOptions = (groupsData || []).map((group) => ({
        ...group,
        options: (optionsData || []).filter((opt) => opt.group_id === group.id),
      }));

      // Add ungrouped options as a virtual group if they exist
      const ungroupedOptions = (optionsData || []).filter((opt) => !opt.group_id);
      if (ungroupedOptions.length > 0) {
        groupedOptions.push({
          id: 'ungrouped',
          product_id: productId,
          name: 'Opções sem grupo',
          description: 'Opções criadas anteriormente',
          is_required: false,
          min_selections: 0,
          max_selections: ungroupedOptions.length,
          selection_type: 'multiple',
          sort_order: 999,
          created_at: new Date().toISOString(),
          options: ungroupedOptions,
        });
      }

      setGroups(groupedOptions);
      // Expand all groups by default
      setExpandedGroups(new Set(groupedOptions.map((g) => g.id)));
    } catch (error: any) {
      console.error('Error loading options:', error);
      toast({
        title: 'Erro ao carregar opções',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Group handlers
  const openGroupModal = (group?: OptionGroup) => {
    if (group && group.id !== 'ungrouped') {
      setGroupForm({
        name: group.name,
        description: group.description || '',
        is_required: group.is_required,
        min_selections: group.min_selections,
        max_selections: group.max_selections,
        selection_type: group.selection_type,
      });
      setGroupModal({ open: true, group });
    } else {
      setGroupForm({
        name: '',
        description: '',
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        selection_type: 'single',
      });
      setGroupModal({ open: true, group: null });
    }
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) return;

    setSaving(true);
    try {
      const data = {
        product_id: productId,
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || null,
        is_required: groupForm.is_required,
        min_selections: groupForm.min_selections,
        max_selections: groupForm.max_selections,
        selection_type: groupForm.selection_type,
        sort_order: groupModal.group?.sort_order ?? groups.length,
      };

      if (groupModal.group) {
        const { error } = await supabase
          .from('product_option_groups')
          .update(data)
          .eq('id', groupModal.group.id);
        if (error) throw error;
        toast({ title: 'Grupo atualizado' });
      } else {
        const { error } = await supabase.from('product_option_groups').insert(data);
        if (error) throw error;
        toast({ title: 'Grupo criado' });
      }

      setGroupModal({ open: false, group: null });
      loadOptions();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (groupId === 'ungrouped') return;

    try {
      const { error } = await supabase
        .from('product_option_groups')
        .delete()
        .eq('id', groupId);
      if (error) throw error;
      toast({ title: 'Grupo excluído' });
      loadOptions();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Option handlers
  const openOptionModal = (groupId: string, option?: OptionItem) => {
    if (option) {
      setOptionForm({
        name: option.name,
        description: option.description || '',
        price_modifier: option.price_modifier.toString(),
      });
      setOptionModal({ open: true, groupId, option });
    } else {
      setOptionForm({ name: '', description: '', price_modifier: '0' });
      setOptionModal({ open: true, groupId, option: null });
    }
  };

  const saveOption = async () => {
    if (!optionForm.name.trim()) return;

    setSaving(true);
    try {
      const groupId = optionModal.groupId === 'ungrouped' ? null : optionModal.groupId;
      const group = groups.find((g) => g.id === optionModal.groupId);

      const data = {
        product_id: productId,
        group_id: groupId,
        name: optionForm.name.trim(),
        description: optionForm.description.trim() || null,
        price_modifier: parseFloat(optionForm.price_modifier) || 0,
        is_required: false,
        is_available: true,
        sort_order: optionModal.option?.sort_order ?? (group?.options.length || 0),
      };

      if (optionModal.option) {
        const { error } = await supabase
          .from('product_options')
          .update(data)
          .eq('id', optionModal.option.id);
        if (error) throw error;
        toast({ title: 'Opção atualizada' });
      } else {
        const { error } = await supabase.from('product_options').insert(data);
        if (error) throw error;
        toast({ title: 'Opção adicionada' });
      }

      setOptionModal({ open: false, groupId: '', option: null });
      loadOptions();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async (optionId: string) => {
    try {
      const { error } = await supabase
        .from('product_options')
        .delete()
        .eq('id', optionId);
      if (error) throw error;
      toast({ title: 'Opção excluída' });
      loadOptions();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Opções de {productName}
            </DialogTitle>
            <DialogDescription>
              Configure tamanhos, bordas, adicionais e outras opções do produto
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Group Button */}
              <Button onClick={() => openGroupModal()} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo de Opções
              </Button>

              {/* Groups List */}
              {groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma opção configurada</p>
                  <p className="text-sm">Crie grupos como "Tamanho", "Borda", "Adicionais"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <Card key={group.id} className="overflow-hidden">
                      <Collapsible
                        open={expandedGroups.has(group.id)}
                        onOpenChange={() => toggleExpanded(group.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-base">{group.name}</CardTitle>
                                  <div className="flex gap-2 mt-1">
                                    {group.is_required && (
                                      <Badge variant="secondary" className="text-xs">
                                        Obrigatório
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {SELECTION_TYPES.find((t) => t.value === group.selection_type)?.label || group.selection_type}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {group.options.length} {group.options.length === 1 ? 'opção' : 'opções'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {group.id !== 'ungrouped' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openGroupModal(group);
                                      }}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteGroup(group.id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {expandedGroups.has(group.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="p-4 pt-0 space-y-2">
                            {group.options.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-background"
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{option.name}</p>
                                    {option.description && (
                                      <p className="text-sm text-muted-foreground">{option.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`font-medium ${option.price_modifier > 0 ? 'text-success' : option.price_modifier < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {option.price_modifier > 0 && '+'}
                                    {option.price_modifier !== 0 ? `R$ ${Number(option.price_modifier).toFixed(2)}` : 'Incluso'}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openOptionModal(group.id, option)}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => deleteOption(option.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}

                            <Button
                              variant="outline"
                              className="w-full mt-2 border-dashed"
                              onClick={() => openOptionModal(group.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar opção
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Modal */}
      <Dialog open={groupModal.open} onOpenChange={(open) => !open && setGroupModal({ open: false, group: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{groupModal.group ? 'Editar Grupo' : 'Novo Grupo de Opções'}</DialogTitle>
            <DialogDescription>
              Ex: "Tamanho", "Borda", "Adicionais", "Sabores"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do grupo *</Label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Ex: Tamanho, Borda, Adicionais"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Ex: Escolha o tamanho da pizza"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de seleção</Label>
              <Select
                value={groupForm.selection_type}
                onValueChange={(value) => setGroupForm({ ...groupForm, selection_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SELECTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label>Obrigatório</Label>
                <p className="text-sm text-muted-foreground">Cliente precisa escolher</p>
              </div>
              <Switch
                checked={groupForm.is_required}
                onCheckedChange={(checked) => setGroupForm({ ...groupForm, is_required: checked })}
              />
            </div>

            {groupForm.selection_type === 'multiple' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mínimo de seleções</Label>
                  <Input
                    type="number"
                    min="0"
                    value={groupForm.min_selections}
                    onChange={(e) => setGroupForm({ ...groupForm, min_selections: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máximo de seleções</Label>
                  <Input
                    type="number"
                    min="1"
                    value={groupForm.max_selections}
                    onChange={(e) => setGroupForm({ ...groupForm, max_selections: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal({ open: false, group: null })}>
              Cancelar
            </Button>
            <Button onClick={saveGroup} disabled={saving || !groupForm.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {groupModal.group ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Option Modal */}
      <Dialog open={optionModal.open} onOpenChange={(open) => !open && setOptionModal({ open: false, groupId: '', option: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{optionModal.option ? 'Editar Opção' : 'Nova Opção'}</DialogTitle>
            <DialogDescription>
              Ex: "Grande (+R$10)", "Catupiry (+R$5)", "Sem cebola"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da opção *</Label>
              <Input
                value={optionForm.name}
                onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                placeholder="Ex: Grande, Catupiry, Calabresa"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={optionForm.description}
                onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                placeholder="Ex: Pizza de 12 fatias"
              />
            </div>

            <div className="space-y-2">
              <Label>Alteração no preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={optionForm.price_modifier}
                onChange={(e) => setOptionForm({ ...optionForm, price_modifier: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Use valores positivos para adicionar ao preço, negativos para desconto, ou 0 se incluso
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionModal({ open: false, groupId: '', option: null })}>
              Cancelar
            </Button>
            <Button onClick={saveOption} disabled={saving || !optionForm.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {optionModal.option ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
